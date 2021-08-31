import { expect } from 'chai';
require('mocha');
import * as _chai from 'chai';
import { BigNumber } from 'bignumber.js';
import { getMultiplyParams } from './../src/index';
import { DesiredCDPState, MarketParams, VaultInfo } from '../src/internal/types';
_chai.should();
const one = new BigNumber(1);
describe('getMultiplyParams all fees', async () => {
  let marketParams: MarketParams;
  let vaultInfo: VaultInfo;

  before(async () => {
    marketParams = new MarketParams({
      marketPrice: 3000,
      oraclePrice: 3000,
      FF: 0.0009,
      OF: 0.0003,
      slippage: 0.03,
    });
    vaultInfo = new VaultInfo(100000, 100, 1.5);
  });
  describe(`multiply increase inital debt=10000 collRatio 3`, async () => {
    const expectedCollDelta = 31.428212141217895;
    const expectedDebtDelta = 97142.31821182685;
    const desiredCollRatio = 2;
    it(`should draw additional ${expectedDebtDelta} DAI debt when changing collateralisation ratio from 3 to ${desiredCollRatio}`, async () => {
      const desiredCdpState = new DesiredCDPState(new BigNumber(desiredCollRatio), 0, 0, 0, 0);
      const retVal = getMultiplyParams(marketParams, vaultInfo, desiredCdpState, false);
      expect(retVal.debtDelta.toNumber()).to.be.greaterThan(expectedDebtDelta * 0.9999);
      expect(retVal.debtDelta.toNumber()).to.be.lessThan(expectedDebtDelta * 1.0001);
      expect(retVal.collateralDelta.toNumber()).to.be.greaterThan(expectedCollDelta * 0.9999);
      expect(retVal.collateralDelta.toNumber()).to.be.lessThan(expectedCollDelta * 1.0001);
    });
    it(`should end with correct collateralisation ratio when changing collateralisation ratio from 3 to ${desiredCollRatio}`, async () => {
      const desiredCdpState = new DesiredCDPState(new BigNumber(desiredCollRatio), 0, 0, 0, 0);
      const retVal = getMultiplyParams(marketParams, vaultInfo, desiredCdpState, false);
      const finalDebt = retVal.debtDelta.plus(vaultInfo.currentDebt);
      const finalCollVal = retVal.collateralDelta
        .plus(vaultInfo.currentCollateral)
        .times(marketParams.oraclePrice);
      expect(finalCollVal.dividedBy(finalDebt).toNumber()).to.be.greaterThanOrEqual(
        desiredCollRatio,
      );
      expect(finalCollVal.dividedBy(finalDebt).toNumber()).to.be.lessThan(desiredCollRatio * 1.001);
    });
  });
});
