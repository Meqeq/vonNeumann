import React, { Component } from 'react';

export default class Settings extends Component {
    render() {
        return(
            <div className="settings-popup">
                <div className="fog" onClick={ () => this.props.close() }/>
                <div className="settings-content">
                    <div className="label"> Prędkość działania </div>
                    <div className="keke">
                        <label>
                            <input type="radio" name="option" value="100" 
                                onChange={ event => this.props.changeSpeed(event.target.value) } 
                                checked={ this.props.speed === 100 ? true : false }
                            /> Wolno 
                        </label>
                        <br />
                        <label>
                            <input type="radio" name="option" value="50" 
                                onChange={ event => this.props.changeSpeed(event.target.value) } 
                                checked={ this.props.speed ===50 ? true : false }
                            /> Średnio
                        </label>
                        <br />
                        <label>
                            <input type="radio" name="option" value="10" 
                                onChange={ event => this.props.changeSpeed(event.target.value) } 
                                checked={ this.props.speed ===10 ? true : false }
                            /> Szybko
                        </label>
                        <br />
                        <label>
                            <input type="radio" name="option" value="3" 
                                onChange={ event => this.props.changeSpeed(event.target.value) } 
                                checked={ this.props.speed ===3 ? true : false }
                            /> Bardzo szybko | Ostrożnie!
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}