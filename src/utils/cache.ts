/**
 * A memoization tool to store values related to two `Object`s.
 */
export class Cache <KT extends WeakKey, VT> 
{
    /**
     * The internal 2D map object.
     */
    private table: WeakMap<KT, WeakMap<KT, VT>>;

    constructor ()
    {
        this.table = new WeakMap();
    }

    /**
     * Sets the given `value` to the given point [`key1`, `key2`].
     * 
     * @param key1 The first half of the key.
     * @param key2 The second half of the key.
     * @param value The value to set on point [`key1`, `key2`].
     * @returns the `value` back.
     */
    public set (key1: KT, key2: KT, value: VT): VT
    {
        if (!this.table.has(key1))
            this.table.set(key1, new WeakMap());

        this.table.get(key1)!.set(key2, value);
        
        return value;
    }

    /**
     * Checks whether the given point [`key1`, `key2`] exists in this `Cache`.
     * @param key1 The first half of the key.
     * @param key2 The second half of the key.
     * @returns `true` if the point [`key1`, `key2`] had been initialized prior to this call.
     */
    public has (key1: KT, key2: KT): boolean
    {
        return this.table.get(key1)?.has(key2) ?? false;
    }

    /**
     * Fetches the value of the point [`key1`, `key2`], if it exists.
     * 
     * @param key1 The first half of the key.
     * @param key2 The second half of the key.
     * @returns The value of the given point, if it exists; `undefined` otherwise.
     */
    public get (key1: KT, key2: KT): VT | undefined
    {
        return this.table.get(key1)?.get(key2);
    }

    /**
     * Clears all entries from the `Cache`.
     */
    public clear (): void 
    {
        this.table = new WeakMap();
    }
}