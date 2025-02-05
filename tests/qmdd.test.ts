import { Complex } from "../src/complex";
import { Control, H, I, X } from "../src/gates";
import { QMDD } from "../src/qmdd";

describe('QMDD: ', () =>
{
    test('Vertices self-normalize', () =>
    {
        const terminal = new QMDD();
        const y = new QMDD(1, [
            { dest: terminal, weight: 0  },
            { dest: terminal, weight: Complex.NEG_I },
            { dest: terminal, weight: Complex.I     },
            { dest: terminal, weight: 0  }]);

        expect(y.scalar).toBe(Complex.NEG_I);
        expect(y.edges.map(e => e.weight)).toEqual([0, 1, Complex.NEG_ONE, 0]);
    });

    test('Identical vertices merge', () =>
    {
        const terminal = new QMDD();
        const y0 = new QMDD(0, [
            { dest: terminal, weight: 0  },
            { dest: terminal, weight: Complex.NEG_I },
            { dest: terminal, weight: Complex.I     },
            { dest: terminal, weight: 0  }]);
        const y1 = new QMDD(0, [
            { dest: terminal, weight: 0  },
            { dest: terminal, weight: Complex.NEG_I },
            { dest: terminal, weight: Complex.I     },
            { dest: terminal, weight: 0  }]);

        expect(y0.id).toBe(y1.id);
        expect(y0 === y1).toBe(true);
    });

    test('Identity branches bubble up the scalar', () =>
    {
        const terminal = new QMDD();
        const i1 = new QMDD(1, [
            { dest: terminal, weight: Complex.I },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: Complex.I }]);
        const i0 = new QMDD(0, [
            { dest: i1,       weight: Complex.I },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: i1,       weight: Complex.I }]);
        
        expect(i0.isIdentity).toBe(true);
        expect(i0.scalar).toBe(Complex.NEG_ONE);
        expect(i1.scalar).toBe(1);
    });

    test('Redundant vertices are skipped', () =>
    {
        const terminal = new QMDD();
        const e0 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I }])};
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
        const sum = QMDD.add(e0, e1, terminal);

        expect(sum.dest.isTerminal()).toBe(true);
        expect(sum.weight).toBe(Complex.I);
    });

    test('Hadamard-CNOT QMDD skips a variable', () =>
    {
        const terminal = new QMDD();
        const i = new QMDD(1, [
            { dest: terminal, weight: 1 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 1 }]);
        const hi = new QMDD(0, [
            { dest: i, weight: Complex.A },
            { dest: i, weight: Complex.A },
            { dest: i, weight: Complex.A },
            { dest: i, weight: Complex.NEG_A }]);
        const x = new QMDD(1, [
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 1 },
            { dest: terminal, weight: 1 },
            { dest: terminal, weight: 0 }]);
        const cx = new QMDD(0, [
            { dest: i,        weight: 1 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: x,        weight: 1 }]);

        const e = QMDD.mul(
            QMDD.mul({ dest: hi, weight: 1 }, { dest: cx, weight: 1}, terminal), { dest: hi, weight: 1 }, terminal);

        expect(e.dest.edges.map(v => v.dest.isTerminal())).toEqual([true, false, false, true]);
    });

    test('Scaled identities are labeled as such', () =>
    {
        const terminal = new QMDD();
        const i0 = new QMDD(0, [
            { dest: terminal, weight: Complex.I },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: Complex.I }]);

        expect(i0.isIdentity).toBe(true);
    });

    test('Construction: \nEmpty circuit', () =>
    {
        const e = QMDD.build([], 0);

        expect(e.dest.isTerminal()).toBe(true);
        expect(e.weight).toBe(Complex.ONE);
    });
});

describe('QMDD: Identity vertices self-label: \nIdentity branch grows progressively:', () =>
{
    const terminal = new QMDD();
    const i1 = new QMDD(1, [
        { dest: terminal, weight: 1 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 1 }]);
    const i0 = new QMDD(0, [
        { dest: i1,       weight: 1 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 0 },
        { dest: i1,       weight: 1 }]);

    test('\nFirst layer is an identity',  () => { expect(terminal.isIdentity).toBe(true); });    
    test('\nSecond layer is an identity', () => { expect(i1.isIdentity).toBe(true); });
    test('\nThird layer is an identity',  () => { expect(i0.isIdentity).toBe(true); });
});

describe('QMDD: Identity vertices self-label: \nIdentity branch cut in the middle:', () =>
{
    const terminal = new QMDD();
    const i2 = new QMDD(2, [
        { dest: terminal, weight: 1 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 1 }]);
    const x1 = new QMDD(1, [
        { dest: terminal, weight: 0 },
        { dest: i2,       weight: 1 },
        { dest: i2,       weight: 1 },
        { dest: terminal, weight: 0 }]);            
    const i0 = new QMDD(0, [
        { dest: x1,       weight: 1 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 0 },
        { dest: x1,       weight: 1 }]);

    test('\nFirst layer is an identity',  () => { expect(i2.isIdentity).toBe(true);  });
    test('\nSecond layer is an identity', () => { expect(x1.isIdentity).toBe(false); });
    test('\nThird layer is an identity',  () => { expect(i0.isIdentity).toBe(false); });
});

describe('QMDD: Addition: ', () =>
{
    test('\nSums are cached', () =>
    {
        const terminal = new QMDD();
        const e0 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I }])};
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
        const sum0 = QMDD.add(e0, e1, terminal);
        const sum1 = QMDD.add(e0, e1, terminal);
        
        expect(sum1).toEqual(sum0);
        expect(sum1.dest.id).toBe(sum0.dest.id);
    });

    test('\n0-edges are the neutral element', () =>
    {
        const terminal = new QMDD();
        const e0 = { dest: terminal, weight: 0 };
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
            
        expect(QMDD.add(e0, e1, terminal)).toStrictEqual(e1);
    });

    test('\nCommutativity is respected', () =>
    {
        const terminal = new QMDD();
        const h = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: Complex.A },
                { dest: terminal, weight: Complex.A },
                { dest: terminal, weight: Complex.A },
                { dest: terminal, weight: Complex.NEG_A }])};
        const x = {
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: 1 },
                { dest: terminal, weight: 1 },
                { dest: terminal, weight: 0 }])};
        const sum1 = QMDD.add(h, x, terminal);
        const sum2 = QMDD.add(x, h, terminal);

        expect({ id: sum1.dest.id, weight: sum1.weight })
        .toEqual({ id: sum2.dest.id, weight: sum2.weight });
    });

    test('\nAdding an element to itself', () =>
    {
        const terminal = new QMDD();
        const h = new QMDD(0, [
            { dest: terminal, weight: Complex.A },
            { dest: terminal, weight: Complex.A },
            { dest: terminal, weight: Complex.A },
            { dest: terminal, weight: Complex.NEG_A }]);
        const sum = QMDD.add({ dest: h, weight: 1 }, { dest: h, weight: Complex.I }, terminal);

        expect([sum.dest.id, sum.weight]).toEqual([h.id, Complex.add(1, Complex.I)]);
    });
});

describe('QMDD: Multiplication:', () =>
{
    test('\nProducts are cached', () =>
    {
        const terminal = new QMDD();
        const e0 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.B }])};
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
        const prod0 = QMDD.mul(e0, e1, terminal);
        const prod1 = QMDD.mul(e0, e1, terminal);
        
        expect(prod1).toEqual(prod0);
        expect(prod1.dest.id).toBe(prod0.dest.id);
    });

    test('\n0-edges are the nullifying element', () =>
    {   
        const terminal = new QMDD();
        const e0 = { dest: terminal, weight: 0 };
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
        
        expect(QMDD.mul(e0, e1, terminal)).toStrictEqual(e0);
    });

    test('\n1-edges are the neutral element', () =>
    {
        const terminal = new QMDD();
        const e0 = { dest: terminal, weight: 1 };
        const e1 = { 
            weight: 1,
            dest: new QMDD(0, [
                { dest: terminal, weight: 0 },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: Complex.I },
                { dest: terminal, weight: 0 }])};
        
        expect(QMDD.mul(e0, e1, terminal)).toStrictEqual(e1);
    });
});

describe('QMDD: Multiplication: \nMultiplying by an identity branch yields the same edge, scaled:', () =>
{
    const terminal = new QMDD();
    const h = new QMDD(1, [
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.NEG_A }]);
    const hh = new QMDD(0, [
        { dest: h, weight: Complex.A },
        { dest: h, weight: Complex.A },
        { dest: h, weight: Complex.A },
        { dest: h, weight: Complex.NEG_A }]);
    const i = new QMDD(1, [
        { dest: terminal, weight: Complex.I },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: 0 },
        { dest: terminal, weight: Complex.I }]);
    const ii = new QMDD(0, [
        { dest: i, weight: Complex.B },
        { dest: terminal, weight: 0  },
        { dest: terminal, weight: 0  },
        { dest: i, weight: Complex.B }]);
    const prod = QMDD.mul(
        { dest: hh, weight: 1 },
        { dest: ii, weight: 1 }, terminal);
    
    test('\nThe entry edge gets scaled according to the trivial scalars', () =>
    {
        expect(prod.weight).toBe(Complex.mul(Complex.I, Complex.B));
    });

    test('\nAll top edges point to the same vertex', () =>
    {
        expect(prod.dest.edges.map(e => e.dest.id)).toEqual([h.id, h.id, h.id, h.id]);
    });

    test('\nTop edge weights follow the Hadamard transform', () =>
    {
        expect(prod.dest.edges.map(e => e.weight)).toEqual([1, 1, 1, Complex.NEG_ONE]);
    });
});

describe('QMDD: Multiplication: \nMultiplying a Hermitian with itself yields the identity QMDD:', () =>
{
    const terminal = new QMDD();
    const h = new QMDD(0, [
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.A },
        { dest: terminal, weight: Complex.NEG_A }]);
    const prod = QMDD.mul({ dest: h, weight: 1 }, { dest: h, weight: 1 }, terminal);
    
    test('\nAll edges point to the terminal', () =>
    {
        expect(prod.dest.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe edge weights follow the identity matrix', () =>
    {
        expect(prod.dest.edges.map(e => e.weight)).toEqual([1, 0, 0, 1]);
    });

    test('\nThe final scalar is 1', () => 
    {
        expect(prod.dest.scalar).toEqual(Complex.ONE);
    });

    test('\nThe entry weight is 1', () =>
    {
        expect(prod.weight).toEqual(Complex.ONE);
    });

    test('\nThe vertex auto-labels as an identity', () =>
    {
        expect(prod.dest.isIdentity).toBe(true);
    });
});

describe('QMDD: Multiplication: \nMultiplying a non-Hermitian with its dagger yields the identity QMDD:', () =>
    {
        const terminal = new QMDD();
        const t = new QMDD(0, [
            { dest: terminal, weight: 1 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: Complex.B }]);
        const tdag = new QMDD(0, [
            { dest: terminal, weight: 1 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: Complex.C }]);
    
        const prod = QMDD.mul({ dest: t, weight: 1 }, { dest: tdag, weight: 1 }, terminal);
        
        test('\nAll edges point to the terminal', () =>
        {
            expect(prod.dest.edges.every(e => e.dest.isTerminal())).toBe(true);
        });
    
        test('\nThe edge weights follow the identity matrix', () =>
        {
            expect(prod.dest.edges.map(e => e.weight)).toEqual([1, 0, 0, 1]);
        });
    
        test('\nThe final scalar is 1', () => 
        {
            expect(prod.dest.scalar).toEqual(Complex.ONE);
        });
    
        test('\nThe entry weight is 1', () =>
        {
            expect(prod.weight).toEqual(Complex.ONE);
        });
    
        test('\nThe vertex auto-labels as an identity', () =>
        {
            expect(prod.dest.isIdentity).toBe(true);
        });
    });

describe('QMDD: Construction: \nNon-controlled step:', () =>
{
    const step = [[new H(), new X(), new I()]];
    const e = QMDD.build(step, step.at(0)!.length);

    test('\nAll top edges point to the same destination', () =>
    {
        expect(e.dest.edges.every(e => e.dest.id === e.dest.edges[0].dest.id));
    });

    test('\nAll top edge weights follow the Hadamard transform', () =>
    {
        expect(e.dest.edges.map(e => e.weight)).toEqual([1, 1, 1, Complex.NEG_ONE]);
    });

    test('\nThe top scalar is SQRT(1/2)', () =>
    {
        expect(e.dest.scalar).toBe(Complex.A);
    });

    const v = e.dest.edges[0].dest;

    test('\nThe diagonal edges of the middle vertex point to the terminal', () =>
    {
        expect([v.edges[0].dest.isTerminal(), v.edges[3].dest.isTerminal()]).toEqual([true, true]);
    });

    test('\nThe antidiagonal edges of the middle vertex point to a common destination', () =>
    {
        expect(v.edges[1].dest.id === v.edges[2].dest.id);
    });

    test('\nThe edge weights of the middle vertex follow the X matrix', () =>
    {
        expect(v.edges.map(e => e.weight)).toEqual([0, 1, 1, 0]);
    });

    const v1 = v.edges[1].dest;

    test('\nAll bottom layer edges point to the terminal', () =>
    {
        expect(v1.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe bottom layer edge weights follow the identity matrix', () =>
    {
        expect(v1.edges.map(e => e.weight)).toEqual([1, 0, 0, 1]);        
    });
});

describe('QMDD: Construction: \nControlled from the top step:', () =>
{
    const step = [[new Control(), new X()]];
    const e = QMDD.build(step, step.at(0)!.length);

    test('\nThe top diagonal edges point to different verteces', () =>
    {
        expect(e.dest.edges[0].dest.id !== e.dest.edges[3].dest.id);
    });

    test('\nThe top anti-diagonal edges point to the terminal', () =>
    {
        expect([e.dest.edges[1].dest.isTerminal(), e.dest.edges[2].dest.isTerminal()]).toEqual([true, true]);        
    });

    test('\nThe top edge weights follow the identity matrix', () =>
    {
        expect(e.dest.edges.map(el => el.weight)).toEqual([1, 0, 0, 1]);
    });

    const v0 = e.dest.edges[0].dest;
    const v1 = e.dest.edges[3].dest;

    test('\nThe left sub-branch auto-labels as an identity', () =>
    {
        expect(v0.isIdentity).toBe(true);
    });

    test('\nThe left sub-branch edges all point to the terminal', () =>
    {
        expect(v0.edges.every(el => el.dest.isTerminal())).toBe(true);
    });

    test('\nThe left sub-branch edge weights follow the identity matrix', () =>
    {
        expect(v0.edges.map(el => el.weight)).toEqual([1, 0, 0, 1]);
    });

    test('\nThe right sub-branch edges all point to the terminal', () =>
    {
        expect(v1.edges.every(el => el.dest.isTerminal())).toBe(true);
    });

    test('\nThe right sub-branch edge weights follow the X matrix', () =>
    {
        expect(v1.edges.map(el => el.weight)).toEqual([0, 1, 1, 0]);
    });

    test('\nBoth branches share the same variable', () =>
    {
        expect(v1.variable).toBe(v0.variable);
    });
});

describe('QMDD: Construction: \nControlled from the bottom step:', () =>
{
    const step = [[new X(), new Control()]];
    const e = QMDD.build(step, step.at(0)!.length);

    test('\nThe top diagonal edges point to the same destination', () =>
    {
        expect(e.dest.edges[0].dest.id === e.dest.edges[3].dest.id).toBe(true);
    });

    test('\nThe top anti-diagonal edges point to the same destination', () =>
    {
        expect(e.dest.edges[1].dest.id === e.dest.edges[2].dest.id).toBe(true);        
    });

    test('\nThe top diagonal and anti-diagonal edges point to different destinations', () =>
    {
        expect(e.dest.edges[0].dest.id === e.dest.edges[1].dest.id).toBe(false);
    });

    test('\nThe top edge weights are all 1', () =>
    {
        expect(e.dest.edges.map(e => e.weight)).toEqual([1, 1, 1, 1]);
    });

    const v0 = e.dest.edges[0].dest;
    const v1 = e.dest.edges[1].dest;

    test('\nThe left sub-branch edges all point to the terminal', () =>
    {
        expect(v0.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe left sub-branch edge weights are of a 0-control', () =>
    {
        expect(v0.edges.map(e => e.weight)).toEqual([1, 0, 0, 0]);
    });

    test('\nThe right sub-branch edges all point to the terminal', () =>
    {
        expect(v1.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe right sub-branch edge weights are of an 1-control', () =>
    {
        expect(v1.edges.map(e => e.weight)).toEqual([0, 0, 0, 1]);
    });

    test('\nThe two sub-branches share the same variable', () =>
    {
        expect(v0.variable).toBe(v1.variable);
    });
});

describe('QMDD: Construction: \nControlled from both sides step:', () =>
{
    const step = [[new Control(), new X(), new Control()]];
    const e = QMDD.build(step, step.at(0)!.length);

    test('\nThe top anti-diagonal edges point to the terminal', () =>
    {
        expect([e.dest.edges[1].dest.isTerminal(), e.dest.edges[2].dest.isTerminal()]).toEqual([true, true]);
    });

    const v0 = e.dest.edges[0].dest;

    test('\nThe left sub-branch is the identity', () =>
    {
        expect(v0.isIdentity).toBe(true);
    });

    test('\nThe left sub-branch consists of two verteces and the terminal', () =>
    {
        expect([v0.edges[0].dest.isTerminal(), v0.edges[0].dest.edges[0].dest.isTerminal()]).toEqual([false, true]);
    });

    const v1 = e.dest.edges[3].dest;

    test('\nThe right sub-branch root diagonal edges point to the same destination', () =>
    {
        expect(v1.edges[0].dest.id).toBe(v1.edges[3].dest.id);
    });

    test('\nThe right sub-branch root diagonal edges point to the same destination', () =>
    {
        expect(v1.edges[1].dest.id).toBe(v1.edges[2].dest.id);
    });

    test('\nThe right sub-branch root diagonal and anti-diagonal edges point to different destinations', () =>
    {
        expect(v1.edges[0].dest.id).not.toBe(v1.edges[1].dest.id);
    });

    test('\nAll right sub-branch root edge weights are 1', () =>
    {
        expect(v1.edges.map(e => e.weight)).toEqual([1, 1, 1, 1]);
    });

    const v10 = v1.edges[0].dest;
    const v11 = v1.edges[1].dest;

    test('\nThe right sub-branch diagonal destination edges all point to the terminal', () =>
    {
        expect(v10.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe right sub-branch diagonal destination edge weights are of a 0-control', () =>
    {
        expect(v10.edges.map(e => e.weight)).toEqual([1, 0, 0, 0]);
    });

    test('\nThe right sub-branch anti-diagonal destination edges all point to the terminal', () =>
    {
        expect(v11.edges.every(e => e.dest.isTerminal())).toBe(true);
    });

    test('\nThe right sub-branch anti-diagonal destination edge weights are of an 1-control', () =>
    {
        expect(v11.edges.map(e => e.weight)).toEqual([0, 0, 0, 1]);
    });    
});