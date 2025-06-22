# QOLE

The **Q**uantum **O**perations **L**azy **E**valuator is an easy-to-use Software Development Kit for executing quantum circuits in JavaScript. Behind its simplistic, [Qiskit](https://github.com/Qiskit/qiskit)-like interface, lies a simulation backend based on Quantum Multiple-Valued Decision Diagrams (QMDDs).

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

The declarative style and index-based qubit logic remains intact, while also introducing new compact, quality-of-life syntactic sugars, like method-chaining:

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

Output can be extracted in two ways; the full statevector can be parsed iteratively through a lazy `Generator` object:

```JavaScript
    // lazy parsing
    for (const { state, re, im } of qc.statevector())
        ...

    // can also be force-loaded in memory
    const sv = [...qc.statevector()];
```

which circumvents the exponential overhead of representing a full statevector in-memory. A shot-based method returning counts by sampling the internal `QMDD` diagram is also offered:

```JavaScript
    const counts = qc.sample(10_000);
    console.log(counts.get('11010')?.occurrences);  // counts for |11010>
    console.log(counts.get('11010')?.re);  // also the amplitude of |11010>
    console.log(counts.get('11010')?.im);  // received for free
```

Shot-based sampling also yields the theoretical amplitudes of the occurred basis states "for free".

## Installation (NOTE: Not yet operational)

You can install QOLE as a standalone package through NPM:

```
npm install qole
```
From here, you can access the `QuantumCircuit` class directly and get to work

```JavaScript
    import { QuantumCircuit } from 'qole';
```

or you can peer into the implementation details through the modules `'qole.gates'`, `'qole.qmdd'` and `'qole.complex'`.

## QMDD Backend

The actual simulation is done through these Decision Diagrams. For an initial introduction to QMDDs, please refer to [Zulehner and Wille,  	arXiv:1707.00865 (2017)]( https://doi.org/10.48550/arXiv.1707.00865).

This project acts as a mini-review of the topic, merging together implementation details scattered throughout the literature. Specifically, the main sources followed are:

- [A. Zulehner and R. Wille. "Advanced Simulation of Quantum Computations". arXiv:1707.00865 (2017)](https://doi.org/10.48550/arXiv.1707.00865)
- [R. Wille et al. "Decision Diagrams for Quantum Computing". In: Topaloglu, R.O. (eds) Design Automation of Quantum Computers. Springer, Cham. https://doi.org/10.1007/978-3-031-15699-1_1](https://doi.org/10.1007/978-3-031-15699-1_1)
- [A. Sander et al. "Stripping Quantum Decision Diagrams of their Identity". arXiv:2406.11959 (2024)](https://doi.org/10.48550/arXiv.2406.11959)
- [D. M. Miller et al. "A Decision Diagram Package for Reversible and Quantum Circuit Simulation". 2006 IEEE International Conference on Evolutionary Computation, Vancouver, BC, Canada, 2006, pp. 2428-2435, doi: 10.1109/CEC.2006.1688610](10.1109/CEC.2006.1688610)
- [P. Niemann et al. “Efficient Construction of QMDDs for Irreversible, Reversible, and Quantum Functions”. International Workshop on Reversible Computation (2017)](https://www.cda.cit.tum.de/files/eda/2017_rc_qmmd_construction.pdf)
- [P. Niemann et al. "On the “Q” in QMDDs: Efficient Representation of Quantum Functionality in the QMDD Data-Structure". In: Dueck, G.W., Miller, D.M. (eds) Reversible Computation. RC 2013. Lecture Notes in Computer Science, vol 7948. Springer, Berlin, Heidelberg. https://doi.org/10.1007/978-3-642-38986-3_11](https://doi.org/10.1007/978-3-642-38986-3_11)
- [S. Hillmich et al. "Just Like the Real Thing: Fast Weak Simulation of Quantum Computation". 2020 57th ACM/IEEE Design Automation Conference (DAC), San Francisco, CA, USA, 2020, pp. 1-6, doi: 10.1109/DAC18072.2020.9218555](https://doi.org/10.1109/DAC18072.2020.9218555)
- [D. Goodman et al. "Quantum logic circuit simulation based on the QMDD data structure." Int’l Reed-Muller Workshop (2007)](https://s2.smu.edu/~mitch/ftp_dir/pubs/rmw07a.pdf)
- [A. Zulehner et al. "Accuracy and Compactness in Decision Diagrams for Quantum Computation". 2019 Design, Automation & Test in Europe Conference & Exhibition (DATE), Florence, Italy, 2019, pp. 280-283, doi: 10.23919/DATE.2019.8715040](https://doi.org/10.23919/DATE.2019.8715040)

while also consulting the rest of the bibliography, as well as [the implementation in MQT](https://github.com/munich-quantum-toolkit/core), for further optimization techniques. A full documentation explaining the entire QMDD implementation is in the works.

## Contributing

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Citation

If you use this project in your research, kindly consider citing it as:
> Asimakis Kydros. (2025). QOLE: A QMDD-based Quantum Circuit Simulator (Version 2.0.0) \[Computer software\]. https://github.com/asimakiskydros/QOLE

## Licence

This project is licensed under the [Mozilla Public License 2.0](LICENSE). 
You are free to use, modify, and distribute this code as long as any modifications 
to MPL-licensed files are also distributed under the same license.
