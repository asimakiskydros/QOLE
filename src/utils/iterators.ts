/**
 * Iterates over the passed array in reverse order, without mutating it.
 * @param arr The array to iterate over.
 * @param enumerate If `true`, the true index of the element will also be returned.
 */
export function  reversed <T> (arr: Array<T>, enumerate:  true):  Generator<[number, T]>;
export function  reversed <T> (arr: Array<T>, enumerate?: false): Generator<T>;
export function* reversed <T> (arr: Array<T>, enumerate: boolean = false): Generator<[number, T] | T> 
{
    for (let i = arr.length - 1; i >= 0; i--) 
        yield enumerate ? [i, arr[i]] as [number, T] : arr[i];
    
}

/**
 * Iterates over both passed arrays at the same time, returning their corresponding elements in order.
 * The arrays must have the same size otherwise this will throw.
 * @param arr1 The first array to iterate over.
 * @param arr2 The second array to iterate over.
 * @param enumerate If `true`, the index of the elements will also be returned.
 */
export function  zip <T, S> (arr1: Array<T>, arr2: Array<S>, enumerate:  true):  Generator<[number, T, S]>;
export function  zip <T, S> (arr1: Array<T>, arr2: Array<S>, enumerate?: false): Generator<[T, S]>;
export function* zip <T, S> (arr1: Array<T>, arr2: Array<S>, enumerate: boolean = false): Generator<[number, T, S] | [T, S]>
{
    if (arr1.length !== arr2.length) 
        throw new Error(`Zipped arrays must be of the same length (got ${arr1.length}/${arr2.length})`);

    for (let i = 0; i < arr1.length; i++)
        yield enumerate ? [i, arr1[i], arr2[i]] as [number, T, S] : [arr1[i], arr2[i]];
}