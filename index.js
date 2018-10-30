import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
