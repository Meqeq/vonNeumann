// pokaż to kurwa Onderce, bo ty jego mózg zaprogramowałeś
import React, { Component } from 'react';
import '../css/vn.css';

import ME from 'react-monaco-editor';

export default class VonNeumann extends Component {
    constructor(props) {
        super(props);

        this.state = {
            name: "",
            code: "",
            accA: "",
            accB: "",
            logs: [],
            memory: [],
            currentOp: 0,
            lastAcc: "A",
            ready: false,
            running: false,
            operations: {}
        }

        this.machine = this.state;
    }

    setName(code) {
        let name = code.match(/.UNIT,\w+/);

        if(!name) throw new SyntaxError("Niepoprawna deklaracja nagłówka .UNIT");
        return name[0].substring(6);
    }

    splitTextToLines(txt, regex = /[\w:.,@()#-]+/) {
        let array = [];
        let vr;
        do {
            vr = txt.match(regex);
            if(vr) {
                array.push(vr[0]);
                txt = txt.replace(vr[0], "");
            }

        } while(vr);
        
        return array;
    }

    setVariables(code) {
        let data = code.match(/.DATA[\w\n:.,#-]+(?=.CODE)/);
        
        if(!data) throw new SyntaxError("Niepoprawna deklaracja sekcji .DATA");

        let dataBlock = data[0].substring(6);
        
        let variables = this.splitTextToLines(dataBlock);
        if(!variables) throw new Error("Brak zmiennych");

        this.makeVariables(variables);

        this.chngNameforAddr();

        return code.replace(data[0], "");
    }

    makeVariables(array) {
        let memory = [];
        let address = 0;
        let addresses = {};
        console.log(array);
        array.forEach( element => {
            let res = element.match(/[\w]+:/);
            if(!res) return false;
            console.log(element);
            let vName = res[0].substring(0, res[0].length - 1);
            
            element = element.replace(res[0], "");

            res = element.match(/.WORD,/);
            if(!res) return false;
            element = element.replace(res[0], "");
            
            if( element.indexOf("#") !== -1 || element.indexOf(",") !== -1 ) {
                let length = this.reserveTab(element, memory);
                addresses[vName] = { type: 'tab', adr: address, len: length };
                address += length;
            }
            else {
                if( !isNaN(element) ) element = +element;
                memory.push(element);
                addresses[vName] = { type: 'var', adr: address };
                address++;
            }
            
        });
        this.machine.memory = memory;
        this.machine.addresses = addresses;
        
        return true;
    }

    reserveTab(content, memory) {
        let tab = this.splitTextToLines(content + ",", /[#\w-]+,/);
        let counter = 0;
        //console.log(content);
        tab.forEach( value => {
            if(value.indexOf("#") === -1) {
                value = value.replace(",", "");

                if(!isNaN(value)) value = +value;

                memory.push(value);
                counter++;
            } else {
                let [amount, content] = value.match(/\w+/g);
                
                if(!isNaN(content)) content = + content;

                for(let i = 0; i < amount; i++, memory.push(content), counter++);
            }
        });

        return counter;
    }

    chngNameforAddr() {
        this.machine.memory.forEach( (value, key) => {
            let tab = this.machine.addresses[value];
            if(typeof tab !== "undefined") {
                this.machine.memory[key] = tab.adr;
            }
        })
    }

    setInstructions(code) {
        let instructions = code.match(/.CODE[\w\n\t\r,@():]+/);
        if(!instructions) return false;

        let codeBlock = instructions[0].substring(6);

        let instructionSet = {
            code: this.splitTextToLines(codeBlock),
            labels: []
        }

        if(!this.prepareCode(instructionSet)) return false;
        this.machine.operations = instructionSet;
        return true;
    }

    prepareCode(insSet) {
        insSet.code.forEach( (element, key ) => {
            let res = element.match(/\w+:/);
            if(res) {
                insSet.labels.push({ index: key, name: res[0].substring(0, res[0].length - 1) });
                element = element.replace(res[0], "");
            }

            res = element.match(/\w+,/);
            if(!res) return false;

            let instruction = {};

            instruction.command = res[0].substring(0, res[0].length - 1);

            element = element.replace(res[0], "");

            res = element.match(/[\w@\d]+,?/);

            if(res) {
                instruction.firstParam = res[0].replace(",", "");
                element = element.replace(res[0], "");
            }

            res = element.match(/[(\w@)\d]+,?/);

            if(res) {
                instruction.secondParam = res[0].replace(",", "");
                element = element.replace(res[0], "");
            }

            insSet.code[key] = instruction;
        });
        return true;
    }

    compile() {
        let code = this.machine.code.replace(/\t/g, "").replace(/ /g, "").replace(/\r\n/g, "\n");

        try {
            this.machine.name = this.setName(code);


        } catch(e) {
            console.log(e.name + e.message);
        }
        
        code = this.setVariables(code);

        if(!code) this.log("W sekcji .DATA wystąpiły błędy", "error");

        if(!this.setInstructions(code)) this.log("W kodzie programu wystąpiły błędy", "error");

        this.machine.ready = true;
        this.machine.running = false;
        this.machine.currentOp = 0;
        
        this.log("Skompilowano program: " + this.machine.name);

        this.setState(this.machine);
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

    readMemory(addr) {
        if(!isNaN(addr)) return +addr;

        let b = addr.match(/\(/g);
        //console.log(b);
        if(!b) return addr;
        
        if(b.length === 1) {
            let vr = addr.replace("(", "").replace(")", "");
            let isVar = this.machine.addresses[vr];
            console.log(isVar);
            if(!isVar) return addr;

            return this.machine.memory[isVar.adr];
        }

        if(b.length === 2) {
            let vr = addr.replace(/\(/, "").replace(/\)/, "");
            return this.machine.memory[this.readMemory(vr)];
        }
    }

    storePath(param) {
        if(!isNaN(param)) return +param;

        let b = param.match(/\(/g);

        if(!b) {
            return this.machine.addresses[param].adr;
        } else {
            return this.readMemory(param);
        }
    }

    start() {
        if(this.machine.ready) {
            this.machine.running = true;
            this.run();
        }
    }

    run() {
        if(this.machine.running) {
            console.log("AKTUALNA OPERACJA: " + this.machine.currentOp);
            if(typeof this.machine.operations.code === "undefined") this.compile();

            //console.log(this.machine);
            let operation = this.machine.operations.code[this.machine.currentOp++];
            console.log(operation);
            switch(operation.command) {
                case 'load':
                    this.chngAccContent(operation.firstParam, this.readMemory(operation.secondParam));
                    this.log("Załadowano: " + operation.secondParam + " do " + operation.firstParam);
                    break;
                
                case 'add':
                    let newValue = operation.firstParam.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue += this.readMemory(operation.secondParam);
    
                    this.chngAccContent(operation.firstParam, newValue);
                    this.log("Dodano: " + operation.secondParam + " do " + operation.firstParam);
                    break;
    
                case 'sub':
                    newValue = operation.firstParam.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue -= this.readMemory(operation.secondParam);
    
                    this.chngAccContent(operation.firstParam, newValue);
                    this.log("Odjęto: " + operation.secondParam + " od " + operation.firstParam);
                    break;
    
                case 'mult':
                    newValue = operation.firstParam.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue *= this.readMemory(operation.secondParam);
    
                    this.chngAccContent(operation.firstParam, newValue);
                    this.log("Pomnożono: " + operation.firstParam + " przez " + operation.secondParam);
                    break;
    
                case 'div':
                    newValue = operation.firstParam.indexOf("A") !== -1 ? this.machine.accA : this.machine.accB;
                    newValue = Math.floor(newValue / this.readMemory(operation.secondParam));
    
                    this.chngAccContent(operation.firstParam, newValue);
                    this.log("Podzielono: " + operation.firstParam + " przez " + operation.secondParam);
                    break;
    
                case 'jump':
                    this.machine.currentOp = this.jump(operation.firstParam);
                    this.log("Skok bezwarunkowy do: " + operation.firstParam);
                    break;
    
                case 'jneg': 
                    if(this.machine.lastAcc === "A" && this.machine.accA < 0) this.machine.currentOp = this.jump(operation.firstParam);
                    if(this.machine.lastAcc === "B" && this.machine.accB < 0) this.machine.currentOp = this.jump(operation.firstParam);
                    this.log("Skok jeśli neg do: " + operation.firstParam);
                    break;
    
                case 'jpos':
                    if(this.machine.lastAcc === "A" && this.machine.accA > 0) this.machine.currentOp = this.jump(operation.firstParam);
                    if(this.machine.lastAcc === "B" && this.machine.accB > 0) this.machine.currentOp = this.jump(operation.firstParam);
                    this.log("Skok jeśli pos do: " + operation.firstParam);
                    break;
    
                case 'jzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA === 0) this.machine.currentOp = this.jump(operation.firstParam);
                    if(this.machine.lastAcc === "B" && this.machine.accB === 0) this.machine.currentOp = this.jump(operation.firstParam);
                    this.log("Skok jeśli zero do: " + operation.firstParam);
                    break;
    
                case 'jnzero':
                    if(this.machine.lastAcc === "A" && this.machine.accA !== 0) this.machine.currentOp = this.jump(operation.firstParam);
                    if(this.machine.lastAcc === "B" && this.machine.accB !== 0) this.machine.currentOp = this.jump(operation.firstParam);
                    this.log("Skok jeśli nzero do: " + operation.firstParam);
                    break;
    
                case 'store':
                //console.log(this.storePath(operation.secondParam));
                    if(operation.firstParam.indexOf("A") !== -1) {
                        this.machine.lastAcc = "A";
                        this.machine.memory[this.storePath(operation.secondParam)] = this.machine.accA;
                    } else {
                        this.machine.lastAcc = "B";
                        this.machine.memory[this.storePath(operation.secondParam)] = this.machine.accB;
                    }
                    this.log("Zapisano zawartość " + operation.firstParam + " w " + operation.secondParam);
                    break;
                    
                case 'halt':
                    this.log("Zakończono program");
                    this.machine.running = false;
                    break;
                default:
                    console.log(JSON.stringify(this.machine.memory));
                    console.log("Nieznany rozkaz");
            }
            setTimeout( () => this.run(), 40);
            this.setState(this.machine);
        }
    }

    memoryStore(index, content) {
        let adr = this.state.memory.findIndex( value => (value.name === index ));
        //console.log(this.kek.memory[3]);
        this.kek.memory[adr].value = content;
    }

    jump(label) {
        return (this.machine.operations.labels.find( value => (value.name === label))).index;
    }

    log(text, type = "info") {
        this.machine.logs.push({text, type});
    }

    onChange(code) {
        this.machine.code = code;
        this.setState({ code });
    }

    render() {
        return (
            <div className="machine">
                <div className="control">
                    <div className="state code">
                        <div> Stan </div>
                        { this.state.code !== "" ?
                            <React.Fragment>
                            {
                                this.machine.memory.length > 0 ?
                                <React.Fragment>
                                {
                                    this.machine.running ?
                                    <div className="running machine-state"> Runnnning </div> :
                                    <div className="ready machine-state"> Gotowy do działania </div>
                                }
                                </React.Fragment> :
                                <div className="compile machine-state"> Skompiluj wprowadzony kod </div>
                            }
                            </React.Fragment> :
                            <div className="waiting machine-state"> Wprowadź kod programu </div>
                        }
                    </div>
                    <div className="run">
                        <div onClick={ () => this.compile() }> Skompiluj</div>
                        <div onClick={ () => this.start() }> Uruchom </div>
                    </div>
                    <div className="log code">
                        <div> Dziennik zdarzeń </div>
                        <div className="logs">
                            { this.state.logs.map( (value, key) => (
                                <p key={key}>
                                    { key + 1 } ) { value.text }
                                </p>
                            )) }
                        </div>
                    </div>
                </div>

                <div className="code">
                    <div>Kod</div>
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
                    
                </div>

                <div className="acc">
                    <div className="accA cell">
                        <div className="label"> Akumulator @A </div>
                        <div className="content">
                            { this.state.accA }
                        </div>
                    </div>
                    <div className="accB cell">
                        <div className="label"> Akumulator @B </div>
                        <div className="content">
                            { this.state.accB }
                        </div>
                    </div>
                </div>

                <div className="memory">
                    <div> Pamięć operacyjna </div>
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
                            { this.state.memory.map( (value, key) => {
                                let name = Object.keys(this.machine.addresses).find( value => (this.machine.addresses[value].adr === key));
                                let isTab = Object.keys(this.machine.addresses).find( value => (this.machine.addresses[value].type === "tab" && this.machine.addresses[value].adr === key));
                                let len = "";
                                if(isTab) len = this.machine.addresses[isTab].len;
        
                                return(
                                    <tr key={ key } className={ isTab ? "tab" : "" }>
                                        { name &&
                                            <td rowSpan={ len } className="name">
                                                { name }
                                            </td>
                                        }
                                        <td>
                                            { key }
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
            </div>
        );
    }
}
/*
<div className="cells">
                        { this.state.memory.map( (value, key) => (
                            <div className="cell" key={ key }>
                                <div className="label"> { value.name } </div>
                                <div className="content">
                                    { value.value }
                                </div>
                            </div>
                        ))}
                    </div>*/

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