import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Crosscampus from '../app/crosscampus';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<StrictMode><Crosscampus /></StrictMode>);
