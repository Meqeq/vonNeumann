import React, { Component } from 'react';
import '../css/vn.css';

import ME from 'react-monaco-editor';
import { Container, Row, Col } from 'reactstrap';

export default class VonNeumann extends Component {
    constructor(props) {
        super(props);

        this.state = {
            name: "",
            code: "",
            accA: 0,
            accB: 0,
            logs: [],
            memory: { variables: [], addresses: {} },
            currentOp: 0,
            lastAcc: "A",
            ready: false,
            running: false,
            error: false,
            instructions: { code: [], labels: {} },
            speed: 50
        }

        this.machine = this.state;

        this.state.showSettings = false;
    }
    /**
     * Checks header and name of program, returns name when correct
     * @param {string} code // Code of the program
     */
    setName(code) {
        let name = code.match(/.UNIT,(\w+)/); // matches .UNIT,(name)
        
        if( !name || name.length !== 2 ) throw new SyntaxError("Niepoprawna deklaracja nagłówka .UNIT");
        return name[1];
    }

    /**
     * Returns Object containing memory with declared variables and its addresses
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

        return memory;
    }

    /**
     * Return object containing array of operations with commands and labels
     * @param {string} code Code of the program
     */
    setInstructions(code) {
        let ins = code.match(/\.CODE\n+([\w\n:.,#-@]+)(?=.END)/);
        if(!ins || ins.length !== 2) throw new SyntaxError("Niepoprawna deklaracja bloku .CODE lub brak słowa kluczowego .END");

        let lines = ins[1].match(/[\w:.,@()#-]+/g);
        if(!lines) throw new Error("Brak rozkazów");

        let insSet = { code: [], labels: {} }

        lines.forEach( (element, key) => {
            let res = element.match(/(\w+:)?(\w+),([\w@]+)?,?([\w()-]+)?,?/);
            
            if( typeof res[1] !== "undefined" ) insSet.labels[ res[1].substring(0, res[1].length - 1) ] = key;

            insSet.code[key] = { command: res[2], p1: res[3], p2: res[4] };
        });

        return insSet;
    }

    compile() {
        try {
            let code = this.machine.code.replace(/\t/g, "").replace(/ /g, "").replace(/\r\n/g, "\n");

            this.machine.name = this.setName(code);
            this.machine.memory = this.memoryInit(code);
            this.machine.instructions = this.setInstructions(code);

            this.machine.ready = true;
            this.machine.running = false;
            this.machine.error = false;
            this.machine.currentOp = 0;

            console.log(this.machine);

            this.log("Skompilowano program: " + this.machine.name);
        } catch(e) {
            this.log(e.name + ": " + e.message, "error");
            this.machine.ready = false;
            this.machine.error = true;
        } finally {
            this.setState(this.machine);
        }
    }

    memoryRead(value) {
        if( !isNaN(value) ) return +value;

        let b = value.match(/\(/g);

        if(!b) throw new Error("Wartość " + value + " jest niepoprawna");

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

    run() {
        try {
            if( !this.machine.ready || this.machine.error ) throw new Error("Kod programu nie został jeszcze skompilowany");
            console.log("-------------------------");
            console.log(this.machine.currentOp);
            let operation = this.machine.instructions.code[this.machine.currentOp++];
            console.log(operation.command + "," + operation.p1 + "," + operation.p2);
            switch(operation.command) {
                case 'load':
                    this.chngAccContent(operation.p1, this.memoryRead(operation.p2));
                    break;
                
                case 'add':
                    let newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue += this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    break;

                case 'sub':
                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue -= this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    break;

                case 'mult':
                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue *= this.memoryRead(operation.p2);
    
                    this.chngAccContent(operation.p1, newValue);
                    break;
                
                case 'div':
                    let param = this.memoryRead(operation.p2);
                    if(param === 0) throw new Error("Nastąpiło podzielenie przez 0");

                    newValue = operation.p1.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue = Math.floor(newValue / param);
    
                    this.chngAccContent(operation.p1, newValue);
                    break;
                
                case 'jump':
                    this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    break;
    
                case 'jneg': 
                    if(this.machine.lastAcc === "A" && this.machine.accA < 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB < 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    break;
    
                case 'jpos':
                    if(this.machine.lastAcc === "A" && this.machine.accA > 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB > 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    break;
    
                case 'jzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA === 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB === 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    break;
    
                case 'jnzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA !== 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    if(this.machine.lastAcc === "B" && this.machine.accB !== 0) this.machine.currentOp = this.machine.instructions.labels[operation.p1];
                    break;
    
                case 'store':
                //console.log(this.storePath(operation.secondParam));
                    if(operation.p1.indexOf("A") !== -1) {
                        this.machine.lastAcc = "A";
                        this.memoryStore(this.machine.accA, operation.p2);
                    } else {
                        this.machine.lastAcc = "B";
                        this.memoryStore(this.machine.accB, operation.p2);
                    }
                    break;
                    
                case 'halt':
                    this.log("Zakończono program");
                    this.machine.running = false;
                    break;
                
                default: 
                    throw new Error("Nieznany rozkaz");
            }

            if(this.machine.running) setTimeout( () => this.run(), this.state.speed);
        } catch(e) {
            this.log(e.name + ": " + e.message, "error");
            this.machine.ready = false;
            this.machine.error = true;
        } finally {
            this.setState(this.machine);
        }
    }

    start() {
        this.machine.running = true;
        this.machine.currentOp = 0;
        this.run();
    }

    memoryStore(value, adr) {
        if(adr.indexOf("(") === -1) {
            let address = this.machine.memory.addresses[adr];
            if(!address) throw new Error("Zmienna " + adr + " niezostała zadeklarowana");

            this.machine.memory.variables[address.adr] = value;
        } else {
            console.log("Adres do zapisania" + this.memoryRead(adr));
            this.machine.memory.variables[ this.memoryRead(adr) / 4 ] = value;
            console.log(this.machine.memory.variables);
        }
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
        this.machine.logs.push({text, type});
    }

    onChange(code) {
        this.machine.code = code;
        this.setState({ code });
    }

    changeSpeed(value) {
        if(!isNaN(value)) {
            this.setState({ speed: +value });
            this.machine.speed = +value;
        }
    }

    render() {
        return (
            <Container fluid className="machine">
                { this.state.showSettings && <div className="settings-popup">
                    <div className="fog" onClick={ () => this.setState({ showSettings: false }) }/>
                    <div className="settings-content">
                        <div className="label"> Prędkość działania </div>
                        <div className="keke">
                            <label>
                                <input type="radio" name="option" value="100" 
                                    onChange={ event => this.changeSpeed(event.target.value) } 
                                    checked={ this.state.speed ===100 ? true : false }
                                /> Wolno 
                            </label>
                            <br />
                            <label>
                                <input type="radio" name="option" value="50" 
                                    onChange={ event => this.changeSpeed(event.target.value) } 
                                    checked={ this.state.speed ===50 ? true : false }
                                /> Średnio
                            </label>
                            <br />
                            <label>
                                <input type="radio" name="option" value="10" 
                                    onChange={ event => this.changeSpeed(event.target.value) } 
                                    checked={ this.state.speed ===10 ? true : false }
                                /> Szybko
                            </label>
                            <br />
                            <label>
                                <input type="radio" name="option" value="3" 
                                    onChange={ event => this.changeSpeed(event.target.value) } 
                                    checked={ this.state.speed ===3 ? true : false }
                                /> Bardzo szybko | Ostrożnie!
                            </label>
                        </div>
                    </div>
                </div> }
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
                            <textarea value={ this.state.code } onChange={ value => { this.setState({ code: value.target.value }); this.machine.code = value.target.value } }/>    
                        </div>
                    </Col>
                    <Col md="3" xs="12">
                        <div>
                            <div className="label"> Stan </div>
                            <div className="state">
                                { this.state.code === "" ?
                                    <div className="state-waiting"> Wprowadź kod </div> :
                                    <React.Fragment>
                                        { this.state.error ?
                                            <div className="state-error"> Wystąpił błąd </div>:
                                            <React.Fragment>
                                                { this.machine.memory.variables.length === 0 ?
                                                    <div className="state-compile"> Skompiluj wprowadzony kod </div>: 
                                                    <React.Fragment>
                                                        { this.machine.running ?
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
                        </div>

                        <div className="control">
                            <div onClick={ () => this.compile() } className={ this.state.code !== "" && !this.state.ready ? "sel" : ""}> Skompiluj </div>
                            <div>
                                <div onClick={ () => this.start() } className={ this.state.ready ? "sel": ""}> Uruchom </div>
                                <i onClick={ () => this.setState({ showSettings: true }) } className="fas fa-cog settings" />
                            </div>
                            <div onClick={ () => this.run() }> Wykonaj krok </div>
                        </div>
                        
                        <div className="acc">
                            <div>
                                <div className="label"> @A </div>
                                { this.machine.accA }
                            </div>
                            <div>
                                <div className="label"> @B </div>
                                { this.machine.accB }
                            </div>
                        </div>

                        <div className={ this.state.error ? "log sel" : "log" }>
                            <div className="label"> Dziennik zdarzeń </div>
                            <div className="logs">
                                { this.state.logs.map( (value, key) => (
                                    <p key={key} className={ "log-" + value.type }>
                                        { key + 1 } ) { value.text }
                                    </p>
                                )) }
                            </div>
                        </div>
                    </Col>
                    <Col md="5" xs="12">
                        <div className="memory">
                            <div className="label"> Pamięć operacyjna </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            Nazwa
                                        </th>
                                        <th>
                                            Adres
                                        </th>
                                        <th>
                                            Wartość
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { this.state.memory.variables.map( (value, key) => {
                                        let name = Object.keys(this.machine.memory.addresses).find( value => (this.machine.memory.addresses[value].adr === key));
                                        let isTab = Object.keys(this.machine.memory.addresses).find( value => (this.machine.memory.addresses[value].type === "tab" && this.machine.memory.addresses[value].adr === key));
                                        let len = "";
                                        if(isTab) len = this.machine.memory.addresses[isTab].len;
                
                                        return(
                                            <tr key={ key } className={ isTab ? "tab" : "" }>
                                                { name &&
                                                    <td rowSpan={ len } className="name">
                                                        { name }
                                                    </td>
                                                }
                                                <td>
                                                    { key*4 }
                                                </td>
                                                <td>
                                                    { value }
                                                </td>
                                            </tr>
                                        );
                                    }) }
                                </tbody>
                            </table>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }
}
/*


    slimak() {
        let kek = ['Konstytucja', 'kek', 'elo', 'meqeq', 'kozik', 'rrrrr', 'karwasz'];

        let lastRandoms = [];

        kek: for(let i = 0; i < 100; i++) {
            let random = this.getRandomInt(0, kek.length - 1);

            for(let j = 0; j < lastRandoms.length; j++) {
                if( random === lastRandoms[j] ) continue kek;
            }

            lastRandoms.unshift(random);

            if(lastRandoms.length > 5) lastRandoms.pop();

            console.log(kek[random]);
        }
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }*/