import React, { useState, useEffect } from 'react';
import styles from '../styles/PuzzleGenerator.module.scss';

interface Props {
  onExit: () => void;
}

const logLines = [
  '//ROOT',
  '//ACCESS_REQUEST',
  '//ACCESS_REQUEST_SUCCESS',
  '//COLLECTING_PACKET_1................COMPLETE',
  '//COLLECTING_PACKET_2................COMPLETE',
  '//COLLECTING_PACKET_3................COMPLETE',
  '//LOGIN',
  '//LOGIN_SUCCESS',
  '',
  '//UPLOAD_IN_PROGRESS',
  '//UPLOAD_COMPLETE!',
  '',
  'ALL DAEMONS UPLOADED',
];

export default function TerminalLog({ onExit }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < logLines.length) {
      const t = setTimeout(() => setIndex(index + 1), 300);
      return () => clearTimeout(t);
    }
  }, [index]);

  return (
    <div className={styles['terminal-log']}>
      {logLines.slice(0, index).map((line, idx) => (
        <div key={idx}>{line}</div>
      ))}
      {index >= logLines.length && (
        <button className={styles['exit-button']} onClick={onExit}>
          EXIT INTERFACE
        </button>
      )}
    </div>
  );
}
