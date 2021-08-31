import { BigNumber } from 'bignumber.js';
import { DesiredCDPState, MarketParams, VaultInfo } from './internal/types';
import { ensureBigNumber } from './internal/utils';
import {
  calculateParamsIncreaseMP,
  calculateParamsDecreaseMP,
} from './internal/increaseDecreaseMP';

function getMultiplyParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  desiredCdp: DesiredCDPState,
  skipFlashLoan = false,
  debug = false,
): {
  debtDelta: BigNumber;
  collateralDelta: BigNumber;
  loanFee: BigNumber;
  oazoFee: BigNumber;
} {
  let debtDelta = new BigNumber(0);
  let collateralDelta = new BigNumber(0);
  let loanFee = new BigNumber(0);
  let oazoFee = new BigNumber(0);

  if (desiredCdp.withdrawColl.gt(0) || desiredCdp.withdrawDai.gt(0)) {
    //decrease multiply
    [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsDecreaseMP(
      marketParams.oraclePrice,
      marketParams.marketPrice,
      marketParams.OF,
      skipFlashLoan === false ? marketParams.FF : new BigNumber(0),
      vaultInfo.currentCollateral.minus(desiredCdp.withdrawColl),
      vaultInfo.currentDebt.plus(desiredCdp.withdrawDai),
      desiredCdp.requiredCollRatio,
      marketParams.slippage,
      desiredCdp.providedDai,
      debug,
    );
    if (debtDelta.lt(0) || collateralDelta.lt(0)) {
      throw new Error(
        `calculateParamsDecreaseMP invalid values debt=${debtDelta.toFixed(
          4,
        )} coll=${collateralDelta.toFixed(0)}`,
      );
    }
    debtDelta = debtDelta.times(-1);
    collateralDelta = collateralDelta.times(-1);
  } else {
    if (desiredCdp.providedDai.gt(0) || desiredCdp.providedCollateral.gt(0)) {
      //increase multiply
      [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsIncreaseMP(
        marketParams.oraclePrice,
        marketParams.marketPrice,
        marketParams.OF,
        skipFlashLoan === false ? marketParams.FF : new BigNumber(0),
        vaultInfo.currentCollateral.plus(desiredCdp.providedCollateral),
        vaultInfo.currentDebt.minus(desiredCdp.providedDai),
        desiredCdp.requiredCollRatio,
        marketParams.slippage,
        desiredCdp.providedDai,
        debug,
      );
      if (debtDelta.lt(0) || collateralDelta.lt(0)) {
        throw new Error(
          `calculateParamsIncreaseMP invalid values debt=${debtDelta.toFixed(
            4,
          )} coll=${collateralDelta.toFixed(0)}`,
        );
      }
    } else {
      const currentCollRat = vaultInfo.currentCollateral
        .times(marketParams.oraclePrice)
        .dividedBy(vaultInfo.currentDebt);
      if (currentCollRat.lt(desiredCdp.requiredCollRatio)) {
        //decrease mult
        [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsDecreaseMP(
          marketParams.oraclePrice,
          marketParams.marketPrice,
          marketParams.OF,
          skipFlashLoan === false ? marketParams.FF : new BigNumber(0),
          vaultInfo.currentCollateral.minus(desiredCdp.withdrawColl),
          vaultInfo.currentDebt.plus(desiredCdp.withdrawDai),
          desiredCdp.requiredCollRatio,
          marketParams.slippage,
          desiredCdp.providedDai,
          debug,
        );
        if (debtDelta.lt(0) || collateralDelta.lt(0)) {
          throw new Error(
            `calculateParamsDecreaseMP invalid values debt=${debtDelta.toFixed(
              4,
            )} coll=${collateralDelta.toFixed(0)}`,
          );
        }
        debtDelta = debtDelta.times(-1);
        collateralDelta = collateralDelta.times(-1);
      } else {
        //increase mult
        [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsIncreaseMP(
          marketParams.oraclePrice,
          marketParams.marketPrice,
          marketParams.OF,
          skipFlashLoan === false ? marketParams.FF : new BigNumber(0),
          vaultInfo.currentCollateral.plus(desiredCdp.providedCollateral),
          vaultInfo.currentDebt.minus(desiredCdp.providedDai),
          desiredCdp.requiredCollRatio,
          marketParams.slippage,
          desiredCdp.providedDai,
          debug,
        );
        if (debtDelta.lt(0) || collateralDelta.lt(0)) {
          throw new Error(
            `calculateParamsIncreaseMP invalid values debt=${debtDelta.toFixed(
              4,
            )} coll=${collateralDelta.toFixed(0)}`,
          );
        }
      }
    }
  }

  return {
    debtDelta: ensureBigNumber(debtDelta),
    collateralDelta: ensureBigNumber(collateralDelta),
    loanFee: ensureBigNumber(loanFee),
    oazoFee: ensureBigNumber(oazoFee),
  };
}

function getCloseToDaiParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  skipFlashLoan = false,
  debug = false,
){
  let collateralToExchange = vaultInfo.currentCollateral;
  let minToAmount = vaultInfo.;
  return {
    debtDelta: ensureBigNumber(0),
    collateralDelta: ensureBigNumber(collateralToExchange),
    minToAmount: ensureBigNumber(0),
    oazoFee: ensureBigNumber(0),
    loanFee: ensureBigNumber(0),
  };
}

function getCloseToCollateralParams(){

}

export { getMultiplyParams, getCloseToDaiParams, getCloseToCollateralParams,DesiredCDPState, MarketParams, VaultInfo };
