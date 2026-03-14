export const CallRuntime = {
  showScreen: false,          // renders Component
    isFloating: false,   
    overlayActive: false , 
    isRestoring :false,
  data: {},                   // callerId, targetUser, refs etc
  set(data) {
    this.data = data;
    this.showScreen = true;
    window.dispatchEvent(new Event("render-call-ui"));
  },
  hide() {
    this.showScreen = false;
    this.data = {};
    window.dispatchEvent(new Event("render-call-ui"));
  },
    minimize() {
    this.isFloating = true;
    window.dispatchEvent(new Event("render-call-ui"));
  },

  maximize() {
    this.isFloating = false;
    window.dispatchEvent(new Event("render-call-ui"));
  },

};
