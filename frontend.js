import GUI from 'lil-gui';

// Set up UI
const gui = new GUI();
const fieldsSection = gui.addFolder('fields').onChange(onFieldChange);
const state = {
	// isOverlayOpen: false,
	// myString: 'lil-gui',
	// myNumber: 1,
	// myFunction: function() { alert( 'hi' ) }
    fields: {

    },
    controllers: {

    },
    createField: {
        type: 'select one...',
        name: '',
        value: '',
        create: onCreateField,
    }
}

// Set up UI for dynamically adding a field
const createFieldSection = gui.addFolder( 'New Field' );
createFieldSection.add(state.createField, 'name');
createFieldSection.add(state.createField, 'type', { 
    'boolean': false, 
    'string': '', 
    'number': 0,
}).onChange(onChangeAddType);
let createFieldValueField = createFieldSection.add(state.createField, 'value').disable();
let createFieldCreateButton = createFieldSection.add(state.createField, 'create').disable();

function onChangeAddType(newValue){
    state.createField.value = copy(newValue);
    createFieldValueField.destroy();
    createFieldValueField = createFieldSection.add(state.createField, 'value');

    createFieldCreateButton.destroy();
    createFieldCreateButton = createFieldSection.add(state.createField, 'create');
}
function onCreateField(){
    const { name, value } = state.createField;
    state.fields[name] = copy(value);
    state.controllers[name] = fieldsSection.add(state.fields, name);
    log(`user added new field ${name}:${value}`);
}

function onFieldChange(event){
    // event.object     // object that was modified
	// event.property   // string, name of property
	// event.value      // new value of controller
	// event.controller // controller that was modified
    console.debug('onchange', event);

    const {property:name, value} = event;
    log(`User changed field ${name}:${value}`);
    socket.send(JSON.stringify({ name, value }));
}


// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:8080");

// Connection opened
socket.addEventListener("open", (event) => {
    log('Connected to server');
    socket.send(JSON.stringify({name: "register-frontend"}));
});

socket.addEventListener("error", (event) => {
    console.error('Websocket Error:', error);
    log('Websocket Error:', event);
});

// Listen for messages
socket.addEventListener("message", (event) => {
    const {name, value} = JSON.parse(event.data);
    // console.debug("Message from server ", name, value);

    state.fields[name] = value;

    if(!state.controllers[name]){
        log(`got new field from server ${name}:${value}`);
        state.controllers[name] = fieldsSection.add(state.fields, name);
    }else{
        state.controllers[name].updateDisplay();
    }

});

const outputTable = document.querySelector('#status_output');
const outputBody = outputTable.querySelector('tbody');
function log(message){
    outputBody.innerHTML = `<tr><td>${message}</td></tr>` + outputBody.innerHTML;
}

function copy(val){
    return JSON.parse(JSON.stringify({val})).val;
}