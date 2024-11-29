import { reversed, zip } from '../src/utils/iterators';

describe("Iterator 'reversed'", () =>
{
    test("should iterate over an array in reverse order", () =>
    {
        const result = [...reversed([1, 2, 3])];

        expect(result).toEqual([3, 2, 1]);
    });

    test("should return the index in reverse order along with the element when enumerate is true", () =>
    {
        const result = [...reversed([1, 2, 3], true)];

        expect(result).toEqual([
            [2, 3],
            [1, 2],
            [0, 1]
        ]);
    });

    test("should return nothing for an empty array", () =>
    {
        const result = [...reversed([])];

        expect(result).toEqual([]);
    });

    test("should return nothing for an empty array even if enumerate is true", () =>
    {
        const result = [...reversed([], true)];

        expect(result).toEqual([]);
    });

    test("should handle an array with a single element", () =>
    {
        const result = [...reversed(['a'])];

        expect(result).toEqual(['a']);
    });

    test("should handle an array with a single element even when enumerate is true", () => {
        const result = [...reversed(['a'], true)];

        expect(result).toEqual([[0, 'a']]);
    });
});

describe("Iterator 'zip'", () => 
{
    test('should zip two arrays of the same length', () => 
    {
        const result = [...zip([1, 2, 3], ['a', 'b', 'c'])];

        expect(result).toEqual([
            [1, 'a'],
            [2, 'b'],
            [3, 'c'],
        ]);
    });
    
    test('should zip two arrays of the same length with enumerate true', () => 
    {
        const result = [...zip([1, 2, 3], ['a', 'b', 'c'], true)];

        expect(result).toEqual([
            [0, 1, 'a'],
            [1, 2, 'b'],
            [2, 3, 'c'],
        ]);
    });
    
    test('should throw for arrays with different lengths', () => 
    {    
        const attempt = () => { [...zip([1, 2, 3], ['a', 'b'])]; }
        
        expect(attempt).toThrow('Zipped arrays must be of the same length (got 3/2)');
    });
    
    test('should return nothing for empty arrays', () => 
    {
        const result = [...zip([], [])];

        expect(result).toEqual([]);
    });

    test('should return nothing for empty arrays even if enumerate is true', () => 
    {
        const result = [...zip([], [], true)];

        expect(result).toEqual([]);
    });
    
    test('should handle arrays with one element', () =>
    {
        const result = [...zip([1], ['a'])];

        expect(result).toEqual([[1, 'a']]);
    });
    
    test('should handle arrays with one element even when enumerate is true', () =>
    {
        const result = [...zip([1], ['a'], true)];

        expect(result).toEqual([[0, 1, 'a']]);
    });
});