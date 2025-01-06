# QOLE

The **Q**uantum **O**perations **L**azy **E**valuator is an easy-to-use Software Development Kit for executing quantum circuits in JavaScript. Behind its simplistic, Qiskit-like interface, lies a simulation backend based on Quantum Multiple-Valued Decision Diagrams (QMDDs).

Whether you need to incorporate reversible/quantum algorithmic functionality to your JS project, or you want to benchmark the performance of QMDDs, QOLE is the tool for you.

## Usage

As previously stated, QOLE's interface employs a pattern very similar to Qiskit:

```JavaScript
    const qc = new QuantumCircuit(5);
    
    qc.initialize('01111');
    qc.h(0);
    qc.cx(0, 1);
    qc.cswap(3, 2, 1, '0');
```

The declarative style and index-based qubit logic remains intact, while also introducing new compact, quality-of-life syntactic sugars, like more flexible initialization

```JavaScript
    const qc = new QuantumCircuit(2);

    qc.x(0);
    qc.ch(1, 0);
    qc.initialize(2, true); // initializes to the front
```

and method-chaining

```JavaScript
    const qc = new QuantumCircuit(3)
        .h(0)
        .cx(0, 1)
        .cx(1, 2);
```

QOLE currently supports the following gate set:
```
X, Y, Z, H, S, T, CX, CY, CZ, CH, CS, CCX, CCS, SWAP, CSWAP, MCX
```

notably allowing for both reversible and universal quantum computation. More gates to come. 

Output is given in the form of a statevector object:

```JavaScript
    // loading in memory
    const sv = [...qc.statevector()];

    // lazy parsing
    for (const { state, real, imag } of qc.statevector())
        ...
```

QMDD parsing nature allows for the statevector to be returned in parts (*lazily*), which in general frees the user and the machine from the exponentially heavy memory cost found in most reversible circuits.

## Installation

You can install QOLE as a standalone package through NPM: (*Note: not yet available*)

```
npm install qole
```
From here, you can access the `QuantumCircuit` class directly and get to work

```JavaScript
    import { QuantumCircuit } from 'qole`;
```

or you can peer into the implementation details through the modules `'qole.gates'`, `'qole.qmdd'` and `'qole.complex'`.

Alternatively, you can install the entire project locally to experiment with the code:

```
    npm install asimakiskydros/QOLE
    npm install
```

## Testing

QOLE uses Jest for testing. You can invoke testing in three ways:

1. Normal (terminal-based):
```
    npm test 
```
2. Log-based (uses `jest-reporter.js` for a more verbose output):
```
    npm run test:custom
```

3. Debug mode:
``` 
    npm run test:debug
```

## QMDD Backend

The actual simulation is done through these Decision Diagrams. For an initial introduction to QMDDs, please refer to [Miller and Thornton, 2006, ISMVL](https://doi.org/10.1109/ISMVL.2006.35).

This project (kind of) acts as a mini-review of the topic, merging together implementation details scattered throughout the literature. Specifically, for each important routine, the main sources followed are:

* Matrix operations: [D. M. Miller, M. A. Thornton and D. Goodman, "A Decision Diagram Package for Reversible and Quantum Circuit Simulation," 2006 IEEE International Conference on Evolutionary Computation, Vancouver, BC, Canada, 2006, pp. 2428-2435, doi: 10.1109/CEC.2006.1688610.](10.1109/CEC.2006.1688610)
* Construction: [Niemann, Philipp et al. “Efficient Construction of QMDDs for Irreversible, Reversible, and Quantum Functions.” International Workshop on Reversible Computation (2017).](https://www.cda.cit.tum.de/files/eda/2017_rc_qmmd_construction.pdf)
* Normalization: [Niemann, P., Wille, R., Drechsler, R. (2013). On the “Q” in QMDDs: Efficient Representation of Quantum Functionality in the QMDD Data-Structure. In: Dueck, G.W., Miller, D.M. (eds) Reversible Computation. RC 2013. Lecture Notes in Computer Science, vol 7948. Springer, Berlin, Heidelberg. https://doi.org/10.1007/978-3-642-38986-3_11](https://doi.org/10.1007/978-3-642-38986-3_11)
* Evaluation: [Goodman, David, et al. "Quantum logic circuit simulation based on the QMDD data structure." Int’l Reed-Muller Workshop. 2007.](https://s2.smu.edu/~mitch/ftp_dir/pubs/rmw07a.pdf)
* Skipped Variables Handling: [D. Y. Feinstein and M. A. Thornton, "On the Skipped Variables of Quantum Multiple-Valued Decision Diagrams," 2011 41st IEEE International Symposium on Multiple-Valued Logic, Tuusula, Finland, 2011, pp. 164-169, doi: 10.1109/ISMVL.2011.22.](https://doi.org/10.1109/ISMVL.2011.22)

while also consulting the rest of the bibliography for further optimization techniques. A full documentation explaining the entire QMDD implementation is in the works.

# Contributing

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

This project is licensed under the [Mozilla Public License 2.0](LICENSE). 
You are free to use, modify, and distribute this code as long as any modifications 
to MPL-licensed files are also distributed under the same license.
