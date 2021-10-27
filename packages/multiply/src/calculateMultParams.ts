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
    debtDelta = debtDelta.times(-1);
    collateralDelta = collateralDelta.times(-1);
  } else {
    if (desiredCdp.providedDai.gt(0) || desiredCdp.providedCollateral.gt(0)) {
      //increase multiply

      const params = calculateIncrease(marketParams, vaultInfo, desiredCdp, debug);

      [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
      skipFL = params.skipFL;
    } else {
      const currentCollRat = vaultInfo.currentCollateral
        .times(marketParams.oraclePrice)
        .dividedBy(vaultInfo.currentDebt);
      if (currentCollRat.lt(desiredCdp.requiredCollRatio)) {
        const params = calculateDecrease(marketParams, vaultInfo, desiredCdp, debug);

        [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
        skipFL = params.skipFL;

        debtDelta = debtDelta.times(-1);
        collateralDelta = collateralDelta.times(-1);
      } else {
        const params = calculateIncrease(marketParams, vaultInfo, desiredCdp, debug);

        [debtDelta, collateralDelta, oazoFee, loanFee] = params.params;
        skipFL = params.skipFL;

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
): {
  fromTokenAmount: BigNumber;
  toTokenAmount: BigNumber;
  minToTokenAmount: BigNumber;
  borrowCollateral: BigNumber;
  requiredDebt: BigNumber;
  withdrawCollateral: BigNumber;
  skipFL: boolean;
} {
  const _skipFL = false;
  const maxCollNeeded = vaultInfo.currentDebt
    .times(1.00001 /* to account for not up to date value here */)
    .dividedBy(
      marketParams.marketPrice
        .times(one.minus(marketParams.slippage))
        .times(one.plus(marketParams.OF)),
    )
    .times(one.plus(marketParams.FF));

  const _toTokenAmount = vaultInfo.currentDebt
    .times(one.minus(marketParams.OF))
    .times(marketParams.marketPrice);

  const _requiredDebt = new BigNumber(0);

  return {
    fromTokenAmount: vaultInfo.currentCollateral,
    toTokenAmount: _toTokenAmount,
    minToTokenAmount: _toTokenAmount.times(one.minus(marketParams.slippage)),
    borrowCollateral: vaultInfo.currentCollateral,
    requiredDebt: _requiredDebt,
    withdrawCollateral: new BigNumber(0),
    skipFL: _skipFL,
  };
}

function getCloseToCollateralParams(
  marketParams: MarketParams,
  vaultInfo: VaultInfo,
  debug = false,
): {
  fromTokenAmount: BigNumber;
  toTokenAmount: BigNumber;
  minToTokenAmount: BigNumber;
  borrowCollateral: BigNumber;
  requiredDebt: BigNumber;
  withdrawCollateral: BigNumber;
  skipFL: boolean;
} {
  const _requiredAmount = vaultInfo.currentDebt
    .times(1.00001 /* to account for not up to date value here */)
    .times(one.plus(marketParams.OF));
  let _skipFL = false;
  const maxCollNeeded = _requiredAmount.dividedBy(
    marketParams.marketPrice.times(one.plus(marketParams.slippage)),
  );

  if (vaultInfo.currentCollateral.dividedBy(vaultInfo.minCollRatio).gt(maxCollNeeded)) {
    _skipFL = true;
  }
  return {
    fromTokenAmount: maxCollNeeded,
    toTokenAmount: _requiredAmount.dividedBy(one.minus(marketParams.slippage)),
    minToTokenAmount: _requiredAmount,
    borrowCollateral: new BigNumber(0),
    requiredDebt: _skipFL ? new BigNumber(0) : _requiredAmount,
    withdrawCollateral: vaultInfo.currentCollateral.minus(maxCollNeeded),
    skipFL: _skipFL,
  };
}

export {
  getMultiplyParams,
  getCloseToDaiParams,
  getCloseToCollateralParams,
  DesiredCDPState,
  MarketParams,
  VaultInfo,
};
