import { BigNumber } from 'bignumber.js';
import { DesiredCDPState, MarketParams, VaultInfo } from './internal/types';
import { ensureBigNumber, one } from './internal/utils';
import {
  calculateParamsIncreaseMP,
  calculateParamsDecreaseMP,
} from './internal/increaseDecreaseMP';

function calculateIncrease(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  desiredCdp: DesiredCDPState,
  debug = false,
): {
  params: Array<BigNumber>;
  skipFL: boolean;
} {
  let debtDelta: BigNumber;
  let collateralDelta: BigNumber;
  let loanFee: BigNumber;
  let oazoFee: BigNumber;
  let skipFL: boolean;
  skipFL = false;
  [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsIncreaseMP(
    marketParams.oraclePrice,
    marketParams.marketPrice,
    marketParams.OF,
    marketParams.FF,
    vaultInfo.currentCollateral.plus(desiredCdp.providedCollateral),
    vaultInfo.currentDebt.minus(desiredCdp.providedDai),
    desiredCdp.requiredCollRatio,
    marketParams.slippage,
    desiredCdp.providedDai,
    debug,
  );
  const newDebt = vaultInfo.currentDebt.plus(debtDelta);
  const currentCollateralValue = vaultInfo.currentCollateral.times(marketParams.oraclePrice);
  if (currentCollateralValue.dividedBy(newDebt).gt(vaultInfo.minCollRatio)) {
    skipFL = true;
    [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsIncreaseMP(
      marketParams.oraclePrice,
      marketParams.marketPrice,
      marketParams.OF,
      new BigNumber(0), //no FL Fee
      vaultInfo.currentCollateral.plus(desiredCdp.providedCollateral),
      vaultInfo.currentDebt.minus(desiredCdp.providedDai),
      desiredCdp.requiredCollRatio,
      marketParams.slippage,
      desiredCdp.providedDai,
      debug,
    );
  }
  return {
    params: [debtDelta, collateralDelta, oazoFee, loanFee],
    skipFL,
  };
}

function calculateDecrease(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  desiredCdp: DesiredCDPState,
  debug = false,
): {
  params: Array<BigNumber>;
  skipFL: boolean;
} {
  let debtDelta: BigNumber;
  let collateralDelta: BigNumber;
  let loanFee: BigNumber;
  let oazoFee: BigNumber;
  let skipFL: boolean;
  skipFL = false;
  //decrease multiply
  [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsDecreaseMP(
    marketParams.oraclePrice,
    marketParams.marketPrice,
    marketParams.OF,
    marketParams.FF,
    vaultInfo.currentCollateral.minus(desiredCdp.withdrawColl),
    vaultInfo.currentDebt.plus(desiredCdp.withdrawDai),
    desiredCdp.requiredCollRatio,
    marketParams.slippage,
    desiredCdp.providedDai,
    debug,
  );

  const collateralLeft = vaultInfo.currentCollateral.minus(collateralDelta);
  const collateralLeftValue = collateralLeft.times(marketParams.oraclePrice);
  if (collateralLeftValue.dividedBy(vaultInfo.currentDebt).gt(vaultInfo.minCollRatio)) {
    //aproximate, but more restrictive than needed
    skipFL = true;
    //decrease multiply
    [debtDelta, collateralDelta, oazoFee, loanFee] = calculateParamsDecreaseMP(
      marketParams.oraclePrice,
      marketParams.marketPrice,
      marketParams.OF,
      new BigNumber(0), //no FL Fee
      vaultInfo.currentCollateral.minus(desiredCdp.withdrawColl),
      vaultInfo.currentDebt.plus(desiredCdp.withdrawDai),
      desiredCdp.requiredCollRatio,
      marketParams.slippage,
      desiredCdp.providedDai,
      debug,
    );
  }
  return {
    params: [debtDelta, collateralDelta, oazoFee, loanFee],
    skipFL,
  };
}

function getMultiplyParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  desiredCdp: DesiredCDPState,
  debug = false,
): {
  debtDelta: BigNumber;
  collateralDelta: BigNumber;
  loanFee: BigNumber;
  oazoFee: BigNumber;
  skipFL: boolean;
} {
  let debtDelta = new BigNumber(0);
  let collateralDelta = new BigNumber(0);
  let loanFee = new BigNumber(0);
  let oazoFee = new BigNumber(0);
  let skipFL = false;

  if (desiredCdp.withdrawColl.gt(0) || desiredCdp.withdrawDai.gt(0)) {
    const params = calculateDecrease(marketParams, vaultInfo, desiredCdp, debug);

    [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
    skipFL = params.skipFL;
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

      const params = calculateIncrease(marketParams, vaultInfo, desiredCdp, debug);

      [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
      skipFL = params.skipFL;

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
        const params = calculateDecrease(marketParams, vaultInfo, desiredCdp, debug);

        [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
        skipFL = params.skipFL;

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
        const params = calculateIncrease(marketParams, vaultInfo, desiredCdp, debug);

        [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
        skipFL = params.skipFL;

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
    skipFL: skipFL,
  };
}

function getCloseToDaiParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  skipFlashLoan = false,
  debug = false,
) {
  const collateralToExchange = vaultInfo.currentCollateral;
  const minToAmount = vaultInfo.currentCollateral
    .times(marketParams.marketPrice)
    .dividedBy(one.plus(marketParams.slippage).plus(marketParams.OF));
  return {
    collateralDelta: ensureBigNumber(collateralToExchange),
    minToAmount: ensureBigNumber(minToAmount),
    oazoFee: ensureBigNumber(0),
    loanFee: ensureBigNumber(0),
  };
}

function getCloseToCollateralParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  skipFlashLoan = false,
  debug = false,
) {
  throw new Error('not implemented');
}

export {
  getMultiplyParams,
  getCloseToDaiParams,
  getCloseToCollateralParams,
  DesiredCDPState,
  MarketParams,
  VaultInfo,
};
