import React from "react";
import { Composition, registerRoot } from "remotion";
import { CampagnesDemo } from "./CampagnesDemo";
import { PaiementsEchelonnesLIDemo } from "./PaiementsEchelonnesLIDemo";
import { PaiementsEchelonnesYT2Demo } from "./PaiementsEchelonnesYT2Demo";
import { UtilisateursDemo } from "./UtilisateursDemo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="CampagnesDemo"
      component={CampagnesDemo}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={2048}
    />
    <Composition
      id="CampagnesDemo-Square"
      component={CampagnesDemo}
      fps={30}
      width={1080}
      height={1080}
      durationInFrames={2048}
    />

    <Composition
      id="PaiementsEchelonnesLIDemo"
      component={PaiementsEchelonnesLIDemo}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1210}
    />
    <Composition
      id="PaiementsEchelonnesLIDemo-Square"
      component={PaiementsEchelonnesLIDemo}
      fps={30}
      width={1080}
      height={1080}
      durationInFrames={1210}
    />

    <Composition
      id="PaiementsEchelonnesYT2Demo"
      component={PaiementsEchelonnesYT2Demo}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1510}
    />

    <Composition
      id="UtilisateursDemo"
      component={UtilisateursDemo}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1200}
    />
    <Composition
      id="UtilisateursDemo-Square"
      component={UtilisateursDemo}
      fps={30}
      width={1080}
      height={1080}
      durationInFrames={1200}
    />
  </>
);

registerRoot(RemotionRoot);
