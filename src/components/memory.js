import React, { Component } from 'react';

import '../css/memory.css';

export default class Memory extends Component {
    render() {
        return(
            <table>
                <thead>
                    <tr>
                        <th> Nazwa </th>
                        <th> Adres </th>
                        <th> Wartość </th>
                    </tr>
                </thead>
                <tbody>
                    { this.props.variables.map( (value, key) => {
                        let name = Object.keys(this.props.addresses).find( value => (this.props.addresses[value].adr === key));
                        let isTab = Object.keys(this.props.addresses).find( value => (this.props.addresses[value].type === "tab" && this.props.addresses[value].adr === key));
                        let len = "";
                        if(isTab) len = this.props.addresses[isTab].len;

                        return(
                            <tr key={ key } className={ isTab ? "tab" : "" }>
                                { name && <td rowSpan={ len } className="name"> { name } </td> }
                                <td> { key * 4 } </td>
                                <td> { value } </td>
                            </tr>
                        );
                    }) }
                </tbody>
            </table>
        );
    }
}