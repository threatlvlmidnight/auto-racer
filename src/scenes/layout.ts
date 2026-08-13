import Phaser from "phaser";

export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 450;
export const RENDER_SCALE = 2;

const HIGH_DENSITY_TEXT_HOOK = "feature-026-high-density-text";

/** Render the established logical composition into a true 1600×900 canvas. */
export function configureHiDpiScene(scene: Phaser.Scene): void {
  scene.cameras.main
    .setViewport(0, 0, LOGICAL_WIDTH * RENDER_SCALE, LOGICAL_HEIGHT * RENDER_SCALE)
    .setZoom(RENDER_SCALE)
    .centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);

  // Phaser Text is an internal canvas texture. Camera zoom alone enlarges that
  // texture, so every Text needs a matching texture resolution to stay crisp.
  // Listen at the display-list boundary so helper-created and later rerendered
  // text receives the same treatment without scene-specific bookkeeping.
  if (!scene.registry.get(HIGH_DENSITY_TEXT_HOOK)) {
    scene.registry.set(HIGH_DENSITY_TEXT_HOOK, true);
  }
  const displayEvents = scene.sys.displayList.events;
  const applyResolution = (object: Phaser.GameObjects.GameObject): void => {
    if (object instanceof Phaser.GameObjects.Text) object.setResolution(RENDER_SCALE);
  };
  displayEvents.on(Phaser.Scenes.Events.ADDED_TO_SCENE, applyResolution);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    displayEvents.off(Phaser.Scenes.Events.ADDED_TO_SCENE, applyResolution);
  });
}
