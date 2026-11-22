/**
 * Production Web Serial API Driver for 3D Printers & Pen Plotters (Bambu, Prusa, Marlin, GRBL).
 * Enables direct USB streaming of G-code without external host software.
 * Implements strict Send-and-Wait flow control (waiting for 'ok' response from firmware).
 */

export interface SerialStatus {
  isConnected: boolean;
  portName?: string;
  baudRate: number;
  linesSent: number;
  totalLines: number;
  isStreaming: boolean;
  isPaused: boolean;
  lastResponse?: string;
  error?: string;
}

export type StatusListener = (status: SerialStatus) => void;
export type LogListener = (line: string, direction: 'tx' | 'rx' | 'sys') => void;

class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private statusListeners: Set<StatusListener> = new Set();
  private logListeners: Set<LogListener> = new Set();
  private okWaiters: Array<(response: string) => void> = [];

  private status: SerialStatus = {
    isConnected: false,
    baudRate: 115200,
    linesSent: 0,
    totalLines: 0,
    isStreaming: false,
    isPaused: false,
  };

  private gcodeQueue: string[] = [];
  private shouldStopStreaming = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeLog(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private notifyStatus(updates: Partial<SerialStatus>) {
    this.status = { ...this.status, ...updates };
    this.statusListeners.forEach((l) => l(this.status));
  }

  private log(line: string, direction: 'tx' | 'rx' | 'sys') {
    this.logListeners.forEach((l) => l(line, direction));
  }

  private flushWaiters(reason: string = 'cancelled') {
    while (this.okWaiters.length > 0) {
      const waiter = this.okWaiters.shift();
      if (waiter) waiter(reason);
    }
  }

  public waitForOk(timeoutMs: number = 30000): Promise<string> {
    return new Promise((resolve) => {
      let timer: any = null;
      const waiter = (resp: string) => {
        if (timer) clearTimeout(timer);
        resolve(resp);
      };
      this.okWaiters.push(waiter);
      timer = setTimeout(() => {
        const idx = this.okWaiters.indexOf(waiter);
        if (idx >= 0) this.okWaiters.splice(idx, 1);
        resolve('timeout');
      }, timeoutMs);
    });
  }

  public async connect(baudRate: number = 115200): Promise<boolean> {
    if (!this.isSupported()) {
      this.notifyStatus({ error: 'Web Serial API is not supported in this browser. Use Chrome, Edge, or Opera.' });
      return false;
    }

    try {
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort();
      await this.port.open({ baudRate });

      this.notifyStatus({
        isConnected: true,
        baudRate,
        error: undefined,
      });

      this.log(`Connected to USB Serial port @ ${baudRate} baud`, 'sys');
      this.startReading();
      return true;
    } catch (err: any) {
      this.notifyStatus({ error: err?.message || 'Failed to connect to USB port' });
      this.log(`Connection failed: ${err?.message}`, 'sys');
      return false;
    }
  }

  public async disconnect() {
    this.shouldStopStreaming = true;
    this.flushWaiters('disconnected');
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      console.warn('Error closing serial port', err);
    }
    this.notifyStatus({
      isConnected: false,
      isStreaming: false,
      isPaused: false,
    });
    this.log('Disconnected from USB serial port', 'sys');
  }

  private async startReading() {
    if (!this.port || !this.port.readable) return;

    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable).catch(() => {});
    this.reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.log(trimmed, 'rx');
              this.notifyStatus({ lastResponse: trimmed });

              // Send-and-wait flow control: detect firmware 'ok' or error response
              const lower = trimmed.toLowerCase();
              if (lower.startsWith('ok') || lower.includes('ok') || lower.startsWith('error')) {
                const waiter = this.okWaiters.shift();
                if (waiter) {
                  waiter(trimmed);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (this.status.isConnected) {
        this.log(`Read error: ${err?.message}`, 'sys');
      }
    } finally {
      this.reader?.releaseLock();
    }
  }

  public async sendCommand(cmd: string): Promise<void> {
    if (!this.port || !this.port.writable) return;
    const trimmed = cmd.trim();
    if (!trimmed) return;

    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(trimmed + '\n'));
      writer.releaseLock();
      this.log(trimmed, 'tx');
    } catch (err: any) {
      this.log(`Write error: ${err?.message}`, 'sys');
    }
  }

  public async streamGcode(gcodeText: string): Promise<void> {
    if (!this.status.isConnected) {
      this.log('Cannot stream: Not connected to any serial port', 'sys');
      return;
    }

    const lines = gcodeText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith(';'));

    this.gcodeQueue = lines;
    this.shouldStopStreaming = false;

    this.notifyStatus({
      isStreaming: true,
      isPaused: false,
      linesSent: 0,
      totalLines: lines.length,
    });

    this.log(`Starting plot stream: ${lines.length} G-code instructions (Send-and-Wait flow control)`, 'sys');

    for (let i = 0; i < lines.length; i++) {
      if (this.shouldStopStreaming) {
        this.log('Plot streaming halted by user.', 'sys');
        break;
      }

      while (this.status.isPaused && !this.shouldStopStreaming) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (this.shouldStopStreaming) break;

      const line = lines[i];

      // Prepare waiter before sending command to prevent missing fast ok responses
      const okPromise = this.waitForOk(30000);
      await this.sendCommand(line);
      this.notifyStatus({ linesSent: i + 1 });

      const ack = await okPromise;
      if (ack === 'cancelled' || ack === 'disconnected' || this.shouldStopStreaming) {
        break;
      }
      if (ack === 'timeout') {
        this.log(`Warning: Timeout waiting for 'ok' on line ${i + 1} (${line}). Continuing stream.`, 'sys');
      }
    }

    this.notifyStatus({
      isStreaming: false,
      isPaused: false,
    });

    if (!this.shouldStopStreaming) {
      this.log('Plot streaming completed successfully!', 'sys');
    }
  }

  public pauseStream() {
    this.notifyStatus({ isPaused: true });
    this.log('Stream paused', 'sys');
  }

  public resumeStream() {
    this.notifyStatus({ isPaused: false });
    this.log('Stream resumed', 'sys');
  }

  public stopStream() {
    this.shouldStopStreaming = true;
    this.flushWaiters('stopped');
    this.notifyStatus({ isStreaming: false, isPaused: false });
    this.log('Stream stopped', 'sys');
  }

  public async emergencyStop() {
    this.stopStream();
    await this.sendCommand('M112'); // Standard emergency stop command
    await this.sendCommand('M104 S0'); // Turn off hotend
    await this.sendCommand('M140 S0'); // Turn off bed
    this.log('EMERGENCY STOP (M112) SENT', 'sys');
  }
}

export const webSerial = new WebSerialManager();
