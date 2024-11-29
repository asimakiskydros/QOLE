import { Cache } from "../src/utils/cache";

describe("Cache", () =>
{
    test("should throw when trying to call its constructor with invalid key type", () =>
    {
        const cache = new Cache<Object, string>();

        expect(() => { cache.set('xd', {}, 'lmaoo'); }).toThrow();
    });

    describe("should answer correctly whether a point is initialized or not:", () =>
    {
        const cache = new Cache<Object, string>();
        const key1 = new Object();
        const key2 = new Object();

        test("\nAn empty point should return false on .has", () =>
        {
            expect(cache.has(key1, key2)).toBe(false);
        });

        test("\nAn initialized point should return true on .has", () =>
        {
            cache.set(key1, key2, 'xd');

            expect(cache.has(key1, key2)).toBe(true);
        });
    });

    describe("should correctly set and get a value of a point:", () =>
    {
        const cache = new Cache<Object, string>();
        const key1 = new Object();
        const key2 = new Object();

        test("\nUninitialized points should return undefined", () =>
        {
            expect(cache.get(key1, key2)).toBeUndefined();
        });

        test("\nInitialized points should return their values", () =>
        {
            cache.set(key1, key2, 'xd');

            expect(cache.get(key1, key2)).toBe('xd');
        });

        test("\nOverriding points should return the new value then on", () =>
        {
            cache.set(key1, key2, 'lmaoo');

            expect(cache.get(key1, key2)).toBe('lmaoo');
        });
    });

    test("should empty itself on .clear", () =>
    {
        const cache = new Cache<Object, string>();
        const key1 = new Object();
        const key2 = new Object();

        cache.set(key1, key2, 'xd');

        const before = cache.has(key1, key2);

        cache.clear();

        const after = cache.has(key1, key2);

        expect([before, after]).toEqual([true, false]);
    });
});