import { parseMatrix } from '../util';
import { expect, test } from '@jest/globals';

test('parseMatrix splits rows correctly', () => {
  const str = '1C 55\n7A BD';
  const matrix = parseMatrix(str);
  expect(matrix).toEqual([
    [0x1c, 0x55],
    [0x7a, 0xbd],
  ]);
});
