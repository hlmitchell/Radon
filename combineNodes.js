// import state class for instanceof check
const ConstructorNode = require('./constructorNode.js');
const SiloNode = require('./siloNode.js');
const types = require('./constants.js');

// import state class for instanceof check
// import ConstructorNode from './constructorNode.js';
// import SiloNode from './siloNode.js';
// import * as types from './constants.js'

// ==================> SILO TESTING <=================== \\

// const AppState = new ConstructorNode('AppState');

// AppState.initializeState({
//   name: 'Han',
//   age: 25
// })

// AppState.initializeModifiers({
//   age: {
//     incrementAge: (current, payload) => {
//       return current + payload;
//     }
//   }
// });

// const NavState = new ConstructorNode('NavState', 'AppState');

// NavState.initializeState({
//   name: 'Han',
//   cart: {one: 1, array: [1,2,3, {test: 'test'}]}
//   // cart: [{two: 2, three: [1,2,3]}, 5, 10]
// })

// NavState.initializeModifiers({
//   cart: {
//     updateCartItem: (current, index, payload) => {
//       return ++current;
//     },
//     addItem: (current, payload) => {
//       current.newThing = 'A new thing';
//       // current.push(payload);
//       return current;
//     }
//   }
// });

// const ButtState = new ConstructorNode('ButtState');
// ButtState.parent = 'NavState';

// ButtState.initializeState({
//   butt: 'Butt'
// })

//==================> SILO TESTING ENDED <===================\\

const silo = {};

function combineNodes(...args) {
  if (args.length === 0) throw new Error('combineNodes function takes at least one constructorNode');

  // hastable accounts for passing in constructorNodes in any order. 
  // hashtable organizes all nodes into parent-child relationships
  const hashTable = {};
  args.forEach(constructorNode => {
    if (constructorNode.parent === null) {
      // this is the root node, only one constructorNode can have a parent of null
      if (!hashTable.root) hashTable.root = [constructorNode];
      else throw new Error('Only one constructor node can have null parent');
    } else {
      if (!hashTable[constructorNode.parent]) hashTable[constructorNode.parent] = [constructorNode];
      // if parent already exists, and node being added will append to the array of children
      else hashTable[constructorNode.parent].push(constructorNode);
    }
  }) 

  // ensure there is a defined root
  if (!hashTable.root) throw new Error('At least one constructor node must have a null parent');

  // recursive function that will create siloNodes and return them to a parent
  function mapToSilo(constructorNode = 'root', parentConstructorNode = null) {
    const constructorNodeName = (constructorNode === 'root') ? 'root' : constructorNode.name;

    // recursive base case, we only continue if the constructorNode has constructorNode children
    if (!hashTable[constructorNodeName]) return;

    const children = {};

    // loop through the children of constructorNode
    hashTable[constructorNodeName].forEach(currConstructorNode => {
      const valuesOfCurrSiloNode = {};
      children[currConstructorNode.name] = new SiloNode(currConstructorNode.name, valuesOfCurrSiloNode, parentConstructorNode, {}, types.CONTAINER);
      
      // abstract some variables
      const currSiloNode = children[currConstructorNode.name];
      const stateOfCurrConstructorNode = currConstructorNode.state;

      // create SiloNodes for all the variables in the currConstructorNode
      Object.keys(stateOfCurrConstructorNode).forEach(varInConstructorNodeState => {
        // creates siloNodes for object variables
        if (typeof stateOfCurrConstructorNode[varInConstructorNodeState].value === 'object') {
          valuesOfCurrSiloNode[varInConstructorNodeState] = currSiloNode.deconstructObjectIntoSiloNodes(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState], currSiloNode, true);
        }
        // creates siloNodes for primitive variables
        else {
          valuesOfCurrSiloNode[varInConstructorNodeState] = new SiloNode(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState].value, currSiloNode, stateOfCurrConstructorNode[varInConstructorNodeState].modifiers);
          valuesOfCurrSiloNode[varInConstructorNodeState].linkModifiers();
        }
      })

      // recursively check to see if the current constructorNode/siloNode has any children 
      const siloNodeChildren = mapToSilo(currConstructorNode, currSiloNode);
      if (siloNodeChildren) { 
        Object.keys(siloNodeChildren).forEach(siloNode => {
          valuesOfCurrSiloNode[siloNode] = siloNodeChildren[siloNode];
        })
      }
    })
    return children;
  }

  // rootState
  const wrappedRootSiloNode = mapToSilo();

  // will always only be a single key (the root) that is added into the silo
  Object.keys(wrappedRootSiloNode).forEach(rootSiloNode => {
    silo[rootSiloNode] = wrappedRootSiloNode[rootSiloNode];
  });
  
  forEachSiloNode(node => {
    // apply keySubscribe only to object and array silo nodes
    if (node.type === 'OBJECT' || node.type === "ARRAY") {
      node.modifiers.keySubscribe = (key, renderFunc) => {
        const name = node.name + "_" + key;
        node.value[name].subscribers.push(renderFunc);
        node.value[name].notifySubscribers();
      }
    }
  });

  return silo;
}

// callbacks have to accept a SILONODE
function forEachSiloNode(callback) {
  // accessing the single root in the silo
  Object.keys(silo).forEach(siloNodeRootKey => {
    inner(silo[siloNodeRootKey], callback);
  })

  // recursively navigate to every siloNode
  function inner(head, callback) {
    if (head.constructor.name === 'SiloNode') {
      callback(head);
      if (head.type === types.PRIMITIVE) return; // recursive base case
      
      else {
        Object.keys(head.value).forEach(key => {
          if (head.value[key].constructor.name === 'SiloNode') {
            inner(head.value[key], callback);
          }
        })
      }
    }
  }
}

// combineNodes(ButtState, NavState, AppState); // testing purposes
// // combineNodes(AppState, NavState); // testing purposes

// setTimeout(() => {console.log('delay', silo.AppState.value.NavState.getState())}, 1000);
// setTimeout(() => {console.log('Im adding again', silo.AppState.value.NavState.getState().addItem({six: 6}))}, 1001);
// setTimeout(() => {console.log('delay', silo.AppState.value.NavState.getState())}, 1010);


// ==========> TESTS that calling a parent function will modify its child for nested objects <========== \\

// console.log(silo.AppState.value.cart.value.cart_one.value);
// silo.AppState.value.cart.modifiers.increment('cart_one');
// setTimeout(() => {
//   console.log(silo.AppState.value.cart.value.cart_one.value);
// }, 1000);

// ==========> END TESTS that calling a parent function will modify its child for nested objects <========== \\

silo.subscribe = (renderFunction, name) => {

  if (!name) {
    if (!!renderFunction.prototype) {
      name = renderFunction.prototype.constructor.name + 'State';
    } else {
      throw new Error('You can\'t use an anonymous function in subscribe without a name argument.');
    }
  }

  let foundNode;
  let subscribedAtIndex;

  forEachSiloNode(node => {
    if (node.name === name) {
      // change to node.subscribers.push(renderFunction);
      // renderFunction 'this' is bound to a React component
      subscribedAtIndex = node.pushToSubscribers(renderFunction);
      foundNode = node;
    }
  })

  // call renderFunction(foundNode.getState())
  
  function unsubscribe() {
    foundNode.removeFromSubscribersAtIndex(subscribedAtIndex);
  }

  return unsubscribe;
}

// export default combineNodes;
module.exports = combineNodes;