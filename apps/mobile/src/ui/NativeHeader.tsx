import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { font, useColors } from '../theme';
import type { IconName } from './core';

export type HeaderAction = { label: string; sf: SFSymbol; icon: IconName; onPress: () => void; disabled?: boolean };

type Icon = SFSymbol | ImageSourcePropType | undefined;

/**
 * iOS toolbar buttons take SF Symbols; Android's take an image, so the same glyph is rendered once
 * from the bundled icon font in the current ink colour. Returns icons in the order requested.
 */
function useToolbarIcons(specs: { sf: SFSymbol; icon: IconName }[], color: string): Icon[] {
  const key = specs.map((s) => s.icon).join('|');
  const [images, setImages] = useState<Record<string, ImageSourcePropType>>({});
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let live = true;
    specs.forEach((s) => {
      MaterialCommunityIcons.getImageSource(s.icon, 24, color)
        .then((src) => live && src && setImages((m) => ({ ...m, [`${s.icon}${color}`]: src })))
        .catch(() => undefined);
    });
    return () => { live = false; };
  }, [key, color]); // eslint-disable-line react-hooks/exhaustive-deps
  return specs.map((s) => (Platform.OS === 'ios' ? s.sf : images[`${s.icon}${color}`]));
}

/**
 * The system navigation bar for a pushed or presented screen. iOS: UINavigationBar with a minimal
 * chevron, centred title and Liquid Glass bar buttons. Android: Material top app bar with a
 * left-aligned title and a Material back/close icon. A custom `onBack` (discard confirmations,
 * wizard steps) swaps the system back button for a bar button that calls it.
 */
export function NativeHeader({ title, back = 'arrow-left', onBack, actions = [] }: { title?: string; back?: 'arrow-left' | 'close'; onBack?: () => void; actions?: HeaderAction[] }) {
  const c = useColors();
  const ios = Platform.OS === 'ios';
  const custom = !!onBack || back === 'close';
  const left = custom ? { sf: (back === 'close' ? 'xmark' : 'chevron.left') as SFSymbol, icon: (back === 'close' ? 'close' : 'arrow-left') as IconName } : null;
  const icons = useToolbarIcons([...(left ? [left] : []), ...actions], c.ink);
  const leftIcon = left ? icons[0] : undefined;
  const actionIcons = left ? icons.slice(1) : icons;
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title ?? '',
          headerShadowVisible: false,
          headerTintColor: c.ink,
          headerStyle: { backgroundColor: c.bg },
          headerTitleAlign: ios ? 'center' : 'left',
          headerTitleStyle: { fontFamily: font.semibold, fontSize: ios ? 17 : 20, color: c.ink },
          headerBackButtonDisplayMode: 'minimal',
          // Never show the previous route's file name ("(tabs)") as the back label.
          headerBackTitle: '',
          headerBackVisible: !custom,
        }}
      />
      {left && (
        <Stack.Toolbar placement="left" tintColor={c.ink}>
          <Stack.Toolbar.Button icon={leftIcon} onPress={goBack} accessibilityLabel={back === 'close' ? 'Close' : 'Back'} />
        </Stack.Toolbar>
      )}
      {actions.length > 0 && (
        <Stack.Toolbar placement="right" tintColor={c.ink}>
          {actions.map((a, i) => (
            <Stack.Toolbar.Button key={a.label} icon={actionIcons[i]} onPress={a.onPress} disabled={a.disabled} accessibilityLabel={a.label} />
          ))}
        </Stack.Toolbar>
      )}
    </>
  );
}
