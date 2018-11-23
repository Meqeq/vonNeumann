import React, { Component } from 'react';
import './main.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import './css/fontawesome.min.css';

import VN from './components/vonNeumann';

export default class App extends Component {
  render() {
    return (
      <React.Fragment>
        <header> Maszyna von Neumanna </header>

        <VN />
      </React.Fragment>
    );
  }
}
