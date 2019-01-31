import {correctFilepath, splitFilepath} from "../src/utils/path";

function test(s) {
  console.log(s, splitFilepath(s));
  console.log('corrected:', correctFilepath(s))
}

test('./res/server/c');
test('res/server/c');
test('/res/server/c');
