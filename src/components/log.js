import React, { Component } from 'react';
import cookie from 'react-cookies';

export default class Log extends Component {
    state = { errors: true, warnings: true, info: false, exe: false }

    filterLogs(logs) {
        return logs.filter( value => {
            return value.type === "error" && this.state.errors ? true :
            value.type === "warning" && this.state.warnings ? true :
            value.type === "info" && this.state.info ? true :
            value.type === "exe" && this.state.exe ? true : false;
        });
    }

    changeState(sett) {
        this.setState(sett, () => {
            let expires = new Date();
            expires.setDate(expires.getTime() + 1800000);

            cookie.save("logs", this.state, { path: "/"} );
        });
    }

    componentDidMount() {
        let logs = cookie.load('logs');
        if(typeof logs !== "undefined") this.setState( logs );
    }

    render() {
        return(
            <div className="logs">
                <div className="log-content">
                    { this.filterLogs(this.props.logs).map( (value, key) => (
                        <p key={key} className={ "log-" + value.type }>
                            { key + 1 } ) { value.text }
                        </p>
                    )) }
                </div>
                <div className="log-settings">
                    <i onClick={ () => this.changeState({ errors: !this.state.errors }) } className={ this.state.errors ? "fas fa-ban ls-err" : "fas fa-ban" } />
                    <i onClick={ () => this.changeState({ warnings: !this.state.warnings }) } className={ this.state.warnings ? "fas fa-exclamation ls-warn" : "fas fa-exclamation" } />
                    <i onClick={ () => this.changeState({ info: !this.state.info }) } className={ this.state.info ? "fas fa-info ls-info" : "fas fa-info" } />
                    <i onClick={ () => this.changeState({ exe: !this.state.exe }) } className={ this.state.exe ? "fas fa-cogs ls-exe" : "fas fa-cogs" } />
                </div>
            </div>
        );
    }
}