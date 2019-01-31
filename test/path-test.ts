import {splitFilepath} from "../src/utils/path";

function test(s) {
  console.log(s, splitFilepath(s))
}

test('./res/server/c');
test('res/server/c');
test('/res/server/c');
