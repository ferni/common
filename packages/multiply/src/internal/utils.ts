import { ConvertableToBigNumber } from './types';
import { BigNumber } from 'bignumber.js';

function ensureBigNumber(candidate: ConvertableToBigNumber): BigNumber {
  let retVal: BigNumber;
  if (typeof candidate === 'number' || typeof candidate === 'string') {
    retVal = new BigNumber(candidate);
  } else {
    if (BigNumber.isBigNumber(candidate) === false) {
      retVal = new BigNumber(candidate.toString());
    } else {
      retVal = new BigNumber(candidate as BigNumber);
    }
  }

  if (retVal.isNaN()) {
    throw new Error(`Conversion for BigNumber failed`);
  }
  return retVal;
}

const one = new BigNumber(1);
const ten = new BigNumber(10);

export { ensureBigNumber, one, ten };
