import React, { Component } from 'react';

import '../css/state.css';

export default class State extends Component {
    render() {
        return(
            <div className="state">
                { !this.props.code ? <div className="state-waiting"> Wprowadź kod </div> :
                    <React.Fragment>
                        { this.props.error ? <div className="state-error"> Wystąpił błąd </div> :
                            <React.Fragment>
                                { !this.props.compiled ? <div className="state-compile"> Skompiluj wprowadzony kod </div> : 
                                    <React.Fragment>
                                        { this.props.running ?
                                            <div className="state-running"> Runnnnnnning </div> :
                                            <div className="state-ready"> Gotowy do działania </div>
                                        }
                                    </React.Fragment>
                                }
                            </React.Fragment>
                        }
                    </React.Fragment>
                }
            </div>
        );
    }
}