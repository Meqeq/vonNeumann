import React, { Component } from 'react';
import './main.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import './css/fontawesome.min.css';

import VN from './components/vonNeumann';

export default class App extends Component {
  render() {
    return (
      <React.Fragment>
        <header> 
          <i className="fas fa-bong" /> 
          Maszyna von Neumanna </header>
        <React.StrictMode>
          <VN />
        </React.StrictMode>
        <footer>
          MeqeqWengiel &amp; Assembler GANG &amp; Assemblerowe Świry | 2018
        </footer>
      </React.Fragment>
    );
  }
}
