import React, { Component } from 'react';
import cookie from 'react-cookies';
import '../css/vn.css';

import ME from 'react-monaco-editor';
import { Container, Row, Col } from 'reactstrap';
import Settings from './settings';
import Memory from './memory';
import State from './state';
import Log from './log';

export default class VonNeumann extends Component {
    constructor(props) {
        super(props);

        this.machine = {
            name: "",
            lastAcc: "",
            accA: 0,
            accB: 0,
            currentOp: 0,
            ready: false,
            error: false,
            running: false,
            memory: { variables: [], addresses: {} },
            instructions: { code: [], labels: {} }
        }

        this.state = {
            name: "",
            code: "",
            accA: 0,
            accB: 0,
            speed: 50,
            ready: false,
            error: false,
            running: false,
            showSettings: false,
            memory: { variables: [], addresses: {} },
            logs: []
        }
    }
    /**
     * Check header and name of program, returns name when correct
     * @param {string} code // Code of the program
     */
    setName(code) {
        let name = code.match(/.UNIT,(\w+)/); // matches .UNIT,(name)
        
        if( !name || name.length !== 2 ) throw new SyntaxError("Niepoprawna deklaracja nagłówka .UNIT");
        return name[1];
    }

    /**
     * Return Object containing memory with declared variables and its addresses
     * @param {string} code // Code of the program
     */
    memoryInit(code) {
        let data = code.match(/\.DATA\n+([\w\n:.,#-]+)(?=.CODE)/); // matches .DATA (block of variables)
        if( !data || data.length !== 2 ) throw new SyntaxError("Niepoprawny blok zmiennych .DATA lub brak sekcji .CODE");

        let lines = data[1].match(/[\w:.,@()#-]+/g); // matches all lines with variables | splits every variable declaration to array
        if( !lines ) throw new Error("Brak zmiennych");

        let memory = { variables: [], addresses: {} }
        let address = 0;

        lines.forEach( (element, key) => {
            let res = element.match(/(\w+):.WORD,([\w,#-]+)/); // matches (name_of_variable): .WORD,(value)

            if( !res || res.length !== 3 ) throw new SyntaxError("Niepoprawna deklaracja zmiennej w linii: " + (key + 1));

            if( res[2].indexOf("#") === -1 && res[2].indexOf(",") === -1 ) { // when variable is not array
                if( !isNaN(res[2]) ) res[2] = +res[2]; // conversion to number if value in string is number

                memory.variables.push( res[2] );
                memory.addresses[ res[1] ] = { type: 'var', adr: address++ };
            } else { // when variable is array
                memory.addresses[ res[1] ] = { type: 'tab', adr: address };

                let tab = res[2].match(/([\w#-]+)/g);
                
                if(!tab) throw new SyntaxError("Niepoprawna deklaracja tablicy w linii: " + (key + 1))

                tab.forEach( value => {
                    if(value.indexOf("#") === -1) {
                        if(!isNaN(value)) value = +value;
        
                        memory.variables.push(value);
                        address++;
                    } else {
                        let mVal = value.match(/(\d+)#(\d+)/);
        
                        if( !mVal || mVal.length !== 3 ) throw new SyntaxError("Niepoprawny zapis wartości w tablicy z użyciem #");
                        
                        if( !isNaN(mVal[2]) ) mVal[2] = + mVal[2];
        
                        for(let i = 0; i < mVal[1]; i++, memory.variables.push(mVal[2]), address++);
                    }
                });

                memory.addresses[ res[1] ].len = address - memory.addresses[ res[1] ].adr;
            }
        });

        memory.variables.forEach( (value, key) => { // looks in vars for arrays names and changes it to address of first element
            if(typeof memory.addresses[value] !== "undefined") memory.variables[key] = memory.addresses[value].adr*4;
        });
//console.log(memory);
        return memory;
    }

    /**
     * Return object containing array of operations with commands and labels
     * @param {string} code Code of the program
     */
    setInstructions(code) {
        let ins = code.match(/\.CODE\n+([\w\n:.,#-@]+)(?=.END)/); // matches .CODE section
        if(!ins || ins.length !== 2) throw new SyntaxError("Niepoprawna deklaracja bloku .CODE lub brak słowa kluczowego .END");

        let lines = ins[1].match(/[\w:.,@()#-]+/g); // matches all lines with command
        if(!lines) throw new Error("Brak rozkazów");

        let insSet = { code: [], labels: {} }

        lines.forEach( (element, key) => {
            let res = element.match(/(\w+:)?(\w+),([\w@]+)?,?([\w()-]+)?,?/); // matches (label):? (command), (param1)?, (param2)?
            
            if( typeof res[1] !== "undefined" ) insSet.labels[ res[1].substring(0, res[1].length - 1) ] = key;

            insSet.code[key] = { command: res[2], p1: res[3], p2: res[4] };
        });

        return insSet;
    }

    /**
     * Set name, variables and commands 
     */
    compile() {
        try {
            let code = this.state.code.replace(/\t/g, "").replace(/ /g, "").replace(/\r\n/g, "\n"); // delete all spaces and tabs

            this.machine.name = this.setName(code); // set name
            this.machine.memory = this.memoryInit(code); // set variables and adressess
            this.machine.instructions = this.setInstructions(code); // set commands
 
            this.machine.ready = true; // change state of machine
            this.machine.running = false;
            this.machine.error = false;
            this.machine.currentOp = 0;

            this.log("Skompilowano program: " + this.machine.name);
            console.log(this.machine.memory)
        } catch(e) {
            this.log(e.name + ": " + e.message, "error");
            this.machine.ready = false;
            this.machine.error = true;
        } finally {
            this.setState({
                name: this.machine.name,
                ready: this.machine.ready,
                error: this.machine.error,
                running: this.machine.running,
                currentOp: this.machine.currentOp,
                memory: this.machine.memory
            });
        }
    }

    /**
     * Returns value of variable or number 
     * @param {string} value adress of variable or number
     */
    memoryRead(value) {
        if( !isNaN(value) ) return +value;

        let b = value.match(/\(/g);

        if(!b) {
            let adr = 0;
            Object.keys(this.machine.memory.addresses).forEach( (elem, key) => {
                console.log(value + " | " + elem + " | "+key);
                if(elem === value) {
                    adr = this.machine.memory.addresses[elem].adr*4;
                    console.log(adr);
                }
            });
            return adr;
        }

        if(b.length === 1) {
            let vr = value.replace("(", "").replace(")", "");
            let isVar = this.machine.memory.addresses[vr];

            if(!isVar) throw new Error("Zmienna: " + value + " niezostała zadeklarowana");

            return this.machine.memory.variables[isVar.adr];
        }

        if(b.length === 2) {
            let vr = value.replace(/\(/, "").replace(/\)/, "");
            return this.machine.memory.variables[this.memoryRead(vr) / 4];
        }
    }

    executeCommand() {
        try {
            if( !this.machine.ready || this.machine.error ) throw new Error("Najpierw skompiluj kod programu");

            let operation = this.machine.instructions.code[this.machine.currentOp++];

            switch( operation.command ) {
                case 'load':
                    this.chngAccContent(operation.p1, this.memoryRead(operation.p2));
                    this.log("Załadowano " + operation.p2 + " do " + operation.p1, "exe");
                    break;
                
                case 'add':
                    let newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue += this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    this.log("Dodano " + operation.p2 + " do " + operation.p1, "exe");
                    break;

                case 'sub':
                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue -= this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    this.log("Odjęto " + operation.p2 + " od " + operation.p1, "exe");
                    break;

                case 'mult':
                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue *= this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    this.log("Domnożono " + operation.p2 + " do " + operation.p1, "exe");
                    break;
                
                case 'div':
                    let param = this.memoryRead(operation.p2);
                    if(param === 0) throw new Error("Nastąpiło podzielenie przez 0");

                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue = Math.floor(newValue / param);
    
                    this.chngAccContent(operation.p1, newValue);
                    this.log("Podzielono zawartość " + operation.p2 + " przez " + operation.p1, "exe");
                    break;
                
                case 'jump':
                    this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    this.log("Skok do " + operation.p1, "exe");
                    break;
    
                case 'jneg': 
                    if(this.machine.lastAcc === "A" && this.machine.accA < 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB < 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    this.log("Skok jeśli neg do " + operation.p1, "exe");
                    break;
    
                case 'jpos':
                    if(this.machine.lastAcc === "A" && this.machine.accA > 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB > 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    this.log("Skok jeśli pos do " + operation.p1, "exe");
                    break;
    
                case 'jzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA === 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB === 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    this.log("Skok jeśli zero do " + operation.p1, "exe");
                    break;
    
                case 'jnzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA !== 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB !== 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    this.log("Skok jeśli nie zero do " + operation.p1, "exe");
                    break;
    
                case 'store':
                    if(operation.p1.indexOf("A") !== -1) {
                        this.machine.lastAcc = "A";
                        this.memoryStore(this.machine.accA, operation.p2);
                    } else {
                        this.machine.lastAcc = "B";
                        this.memoryStore(this.machine.accB, operation.p2);
                    }
                    this.log("Zapis zawartości " + operation.p1 + " do " + operation.p2, "exe");
                    break;
                    
                case 'halt':
                    this.log("Zakończono program");
                    this.machine.running = false;
                    break;
                
                default: 
                    throw new Error("Nieznany rozkaz");
            }

            if(this.machine.running) setTimeout( () => this.executeCommand(), this.state.speed);
        } catch(e) {
            this.log(e.name + ": " + e.message, "error");
            this.machine.ready = false;
            this.machine.error = true;
        } finally {
            this.setState({
                accA: this.machine.accA,
                accB: this.machine.accB,
                ready: this.machine.ready,
                error: this.machine.error,
                memory: this.machine.memory,
                running: this.machine.running
            });
        }
    }

    start() {
        this.machine.running = true;
        this.machine.currentOp = 0;
        this.executeCommand();
    }

    memoryStore(value, adr) {
        if(adr.indexOf("(") === -1) {
            let address = this.machine.memory.addresses[adr];
            if(!address) throw new Error("Zmienna " + adr + " niezostała zadeklarowana");

            this.machine.memory.variables[address.adr] = value;
        } else this.machine.memory.variables[ this.memoryRead(adr) / 4 ] = value;
    }

    chngAccContent(acc, value) {
        if(acc === "@A") {
            this.machine.accA = value;
            this.machine.lastAcc = "A";
        }
        if(acc === "@B") {
            this.machine.accB = value;
            this.machine.lastAcc = "B";
        }
    }
   
    log(text, type = "info") {
        this.setState({ logs: [...this.state.logs, {text, type} ]});
    }

    onChange(code) {
        let expires = new Date();
        expires.setDate(expires.getTime() + 1800000);

        cookie.save("code", code, { path: "/"} );
        this.setState({ code });
    }

    changeSpeed(value) {
        if(!isNaN(value)) this.setState({ speed: +value }, () => {
            let expires = new Date();
            expires.setDate(expires.getTime() + 1800000);

            cookie.save("speed", this.state.speed, { path: "/"} );
        });
    }

    componentDidMount() {
        let code = cookie.load('code');
        if(typeof code !== "undefined") this.setState({ code });
        let speed = cookie.load('speed');
        if(typeof speed !== "undefined") this.setState({ speed: +speed });
    }

    render() {
        return (
            <Container fluid className="machine">
                { this.state.showSettings &&  <Settings changeSpeed={ value => this.changeSpeed(value) } speed={ this.state.speed } close={ () => this.setState({ showSettings: false }) } />}
                <Row>
                    <Col md="4" xs="12">
                        <div className="label">Kod</div>
                        <div className={ this.state.code === "" ? "code sel" : "code" }>
                            <ME 
                                theme="vs-dark"
                                options={{ 
                                    minimap: {enabled: false},
                                    lineNumbersMinChars: 3,
                                    lineDecorationsWidth: 0,
                                    scrollbar: { verticalScrollbarSize: 0 }
                                }}
                                value={ this.state.code }
                                onChange={ value => this.onChange(value) }
                            /> 
                            <textarea value={ this.state.code } onChange={ value => this.onChange(value.target.value) } />    
                        </div>
                    </Col>
                    <Col md="3" xs="12">
                        <div>
                            <div className="label"> Stan </div>
                            <State code={ this.state.code === "" ? false : true } 
                                error={ this.state.error } running={ this.state.running }
                                compiled={ this.state.memory.variables.length === 0 ? false : true } />
                        </div>

                        <div className="control">
                            <div onClick={ () => this.compile() } className={ this.state.code !== "" && !this.state.ready ? "sel" : ""}> Skompiluj </div>
                            <div>
                                <div onClick={ () => this.start() } className={ this.state.ready ? "sel": ""}> Uruchom </div>
                                <i onClick={ () => this.setState({ showSettings: true }) } className="fas fa-cog settings" />
                            </div>
                            <div onClick={ () => this.executeCommand() }> Wykonaj krok </div>
                        </div>
                        
                        <div className="acc">
                            <div>
                                <div className="label"> @A </div>
                                { this.state.accA }
                            </div>
                            <div>
                                <div className="label"> @B </div>
                                { this.state.accB }
                            </div>
                        </div>

                        <div className={ this.state.error ? "log sel" : "log" }>
                            <div className="label"> Dziennik zdarzeń 
                                <i className="fas fa-broom" onClick={ () => this.setState({ logs: [] }) }/>
                            </div>
                            <Log logs={ this.state.logs } />
                        </div>
                    </Col>
                    <Col md="5" xs="12">
                        <div className="memory">
                            <div className="label"> Pamięć operacyjna </div>
                            <Memory variables={ this.state.memory.variables } addresses={ this.state.memory.addresses } />
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }
}