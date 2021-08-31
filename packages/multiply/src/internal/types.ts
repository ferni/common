import { BigNumber } from 'bignumber.js';
import { ensureBigNumber } from './utils';

// eslint-disable-next-line
type ConvertableToBigNumber = number | string | BigNumber | Object;

type ParamsConstr = {
  oraclePrice: ConvertableToBigNumber;
  marketPrice: ConvertableToBigNumber;
  FF: ConvertableToBigNumber;
  OF: ConvertableToBigNumber;
  slippage: ConvertableToBigNumber;
};

class MarketParams {
  public oraclePrice: BigNumber;
  public marketPrice: BigNumber;
  public FF: BigNumber;
  public OF: BigNumber;
  public slippage: BigNumber;
  constructor(constr: ParamsConstr) {
    this.oraclePrice = ensureBigNumber(constr.oraclePrice);
    this.marketPrice = ensureBigNumber(constr.marketPrice);
    this.FF = ensureBigNumber(constr.FF);
    this.OF = ensureBigNumber(constr.OF);
    this.slippage = ensureBigNumber(constr.slippage);
  }
}
class VaultInfo {
  public currentDebt: BigNumber;
  public currentCollateral: BigNumber;
  public minCollRatio: BigNumber; //minimum acceptable collateralisation ratio
  constructor(
    _debt: ConvertableToBigNumber,
    _coll: ConvertableToBigNumber,
    _minCollRatio: ConvertableToBigNumber,
  ) {
    this.currentDebt = ensureBigNumber(_debt);
    this.currentCollateral = ensureBigNumber(_coll);
    this.minCollRatio = ensureBigNumber(_minCollRatio);
  }
}
class DesiredCDPState {
  public requiredCollRatio: BigNumber;
  public providedCollateral: BigNumber;
  public providedDai: BigNumber;
  public withdrawDai: BigNumber;
  public withdrawColl: BigNumber;

  constructor(
    _reqRatio: ConvertableToBigNumber,
    _providedColl: ConvertableToBigNumber,
    _providedDai: ConvertableToBigNumber,
    _withdrawDai: ConvertableToBigNumber,
    _withdrawColl: ConvertableToBigNumber,
  ) {
    this.providedCollateral = ensureBigNumber(_providedColl);
    this.requiredCollRatio = ensureBigNumber(_reqRatio);
    this.providedDai = ensureBigNumber(_providedDai);
    this.withdrawColl = ensureBigNumber(_withdrawColl);
    this.withdrawDai = ensureBigNumber(_withdrawDai);
  }
}
export type { ConvertableToBigNumber };
export { VaultInfo, MarketParams, DesiredCDPState };
