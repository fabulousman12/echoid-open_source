import { Capacitor } from '@capacitor/core';

const pluginName = 'StartioHelper';

type StartioHelperPlugin = {
  init: (options: { appId: string }) => Promise<void>;
  showRewarded: () => Promise<{ rewarded: boolean }>;
};

const StartioHelper = Capacitor.isPluginAvailable(pluginName)
  ? (window as any).Capacitor.Plugins[pluginName] as StartioHelperPlugin
  : null;

export const initStartApp = async (appId: string) => {
  if (!StartioHelper) {
    console.error('StartioHelper plugin not available');
    return;
  }

  try {
    await StartioHelper.init({ appId });
    console.log('Start.io initialized');
  } catch (error) {
    console.error('Init failed:', error);
  }
};

export const showRewardedAd = async () => {
  if (!StartioHelper) {
    console.error('StartioHelper plugin not available');
    return;
  }

  try {
    const result = await StartioHelper.showRewarded();
    if (result?.rewarded) {
      console.log('User was rewarded!');
    }
    return result;
  } catch (error) {
    console.error('Error showing rewarded ad:', error);
  }
};
