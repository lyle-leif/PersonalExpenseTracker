import React from 'react';
import {createRoot} from 'react-dom/client';
import Tracker from './tracker';
import './globals.css';
createRoot(document.getElementById('peso-root')!).render(<Tracker/>);
