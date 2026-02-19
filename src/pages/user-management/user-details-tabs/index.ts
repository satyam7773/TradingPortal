// Barrel exports for user details tab components
export { default as AddCredits } from './AddCredits';
export { default as GroupQuantitySettings } from './GroupQuantitySettings';
export { default as BrokerageSettings } from './BrokerageSettings';
export { default as TradeMarginSettings } from './TradeMarginSettings';
export { default as SharingDetails } from './SharingDetails';
export { default as ChangePassword } from './ChangePassword';
export { default as InvestorPassword } from './InvestorPassword';
export { default as AccountLimit } from './AccountLimit';
export { default as MarketTradeRight } from './MarketTradeRight';
export { default as RejectionLog } from './RejectionLog';
export { default as SettlementReport } from './SettlementReport';

// Optional mapping from menu `name` to component filename (PascalCase)
export const tabComponentMap: Record<string, string> = {
  addCredits: 'AddCredits',
  groupQuantitySettings: 'GroupQuantitySettings',
  brokerageSettings: 'BrokerageSettings',
  tradeMarginSettings: 'TradeMarginSettings',
  sharingDetails: 'SharingDetails',
  changePassword: 'ChangePassword',
  investorPassword: 'InvestorPassword',
  accountLimit: 'AccountLimit',
  marketTradeRight: 'MarketTradeRight',
  rejectionLog: 'RejectionLog',
  settlementReport: 'SettlementReport',
};

// Explicit dynamic import loaders to ensure bundler includes chunks with correct paths
export const tabLoaders: Record<string, () => Promise<any>> = {
  AddCredits: () => import('./AddCredits'),
  GroupQuantitySettings: () => import('./GroupQuantitySettings'),
  BrokerageSettings: () => import('./BrokerageSettings'),
  TradeMarginSettings: () => import('./TradeMarginSettings'),
  SharingDetails: () => import('./SharingDetails'),
  ChangePassword: () => import('./ChangePassword'),
  InvestorPassword: () => import('./InvestorPassword'),
  AccountLimit: () => import('./AccountLimit'),
  MarketTradeRight: () => import('./MarketTradeRight'),
  RejectionLog: () => import('./RejectionLog'),
  SettlementReport: () => import('./SettlementReport'),
}
