'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ScrubInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  className?: string;
}

export const ScrubInput: React.FC<ScrubInputProps> = ({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min = -Infinity,
  max = Infinity,
  precision = 1,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startVal: number }>({ startX: 0, startVal: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setTempValue(value.toFixed(precision));
    }
  }, [value, isEditing, precision]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (e.button !== 0) return; // Left click only

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startVal: value,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      // Modifier keys: Shift = 10x, Alt = 0.1x
      let multiplier = 1;
      if (moveEvent.shiftKey) multiplier = 10;
      if (moveEvent.altKey) multiplier = 0.1;

      const deltaVal = deltaX * (step * 0.2) * multiplier;
      let nextVal = dragStartRef.current.startVal + deltaVal;

      if (min !== undefined) nextVal = Math.max(min, nextVal);
      if (max !== undefined) nextVal = Math.min(max, nextVal);

      // Round to precision
      const factor = Math.pow(10, precision);
      nextVal = Math.round(nextVal * factor) / factor;

      onChange(nextVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTempValue(value.toString());
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempValue);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      const factor = Math.pow(10, precision);
      onChange(Math.round(clamped * factor) / factor);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        return;
      }
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value.toFixed(precision));
    }
  };

  const displayVal = value.toFixed(precision);

  return (
    <div
      className={`group relative bg-slate-50 border border-slate-200 hover:border-blue-400 transition rounded-lg p-1.5 select-none ${
        isDragging ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
        <span
          onMouseDown={handleMouseDown}
          className="cursor-ew-resize uppercase tracking-wider font-semibold hover:text-blue-600 transition"
          title="Drag horizontally to adjust (Shift for 10x, Alt for 0.1x)"
        >
          {label}
        </span>
        {unit && <span className="text-slate-400">{unit}</span>}
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          step={step}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-full bg-white border border-blue-500 text-slate-900 font-mono text-xs px-2 py-0.5 rounded focus:outline-none tabular-nums shadow-xs"
        />
      ) : (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className="cursor-ew-resize font-mono text-xs font-semibold text-slate-900 tracking-tight tabular-nums flex items-baseline justify-between hover:text-blue-600 transition px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs"
          title="Click + drag horizontally to scrub. Double click to type."
        >
          <span>{displayVal}</span>
          <span className="text-[9px] text-slate-400 font-normal group-hover:text-slate-600">
            {isDragging ? 'SCRUB' : 'DBL-CLK'}
          </span>
        </div>
      )}
    </div>
  );
};
