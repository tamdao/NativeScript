import { View } from "../core/view";
import { isNullOrUndefined, isFunction, getClass } from "../../utils/types";
import { CacheLayerType, layout } from "../../utils/utils";
import { parse } from "../../css-value";

export * from "./background-common"

// TODO: Change this implementation to use 
// We are using "ad" here to avoid namespace collision with the global android object
export module ad {
    let SDK: number;
    function getSDK() {
        if (!SDK) {
            SDK = android.os.Build.VERSION.SDK_INT;
        }

        return SDK;
    }

    let _defaultBackgrounds = new Map<string, android.graphics.drawable.Drawable.ConstantState>();

    function isSetColorFilterOnlyWidget(nativeView: android.view.View): boolean {
        return (
            nativeView instanceof android.widget.Button ||
            (nativeView instanceof android.support.v7.widget.Toolbar
                && getSDK() >= 21 // There is an issue with the DrawableContainer which was fixed for API version 21 and above: https://code.google.com/p/android/issues/detail?id=60183
            )
        );
    }

    export function onBackgroundOrBorderPropertyChanged(view: View) {
        let nativeView = <android.view.View>view._nativeView;
        if (!nativeView) {
            return;
        }

        let background = view.style.backgroundInternal;
        let backgroundDrawable = nativeView.getBackground();
        let cache = <CacheLayerType>view._nativeView;
        let viewClass = getClass(view);

        // always cache the default background constant state.
        if (!_defaultBackgrounds.has(viewClass) && !isNullOrUndefined(backgroundDrawable)) {
            _defaultBackgrounds.set(viewClass, backgroundDrawable.getConstantState());
        }

        if (isSetColorFilterOnlyWidget(nativeView)
            && !isNullOrUndefined(backgroundDrawable)
            && isFunction(backgroundDrawable.setColorFilter)
            && !background.hasBorderWidth()
            && !background.hasBorderRadius()
            && !background.clipPath
            && isNullOrUndefined(background.image)
            && !isNullOrUndefined(background.color)) {
            let backgroundColor = (<any>backgroundDrawable).backgroundColor = background.color.android;
            backgroundDrawable.mutate();
            backgroundDrawable.setColorFilter(backgroundColor, android.graphics.PorterDuff.Mode.SRC_IN);
            backgroundDrawable.invalidateSelf(); // Make sure the drawable is invalidated. Android forgets to invalidate it in some cases: toolbar
            (<any>backgroundDrawable).backgroundColor = backgroundColor;
        }
        else if (!background.isEmpty()) {
            if (!(backgroundDrawable instanceof org.nativescript.widgets.BorderDrawable)) {
                backgroundDrawable = new org.nativescript.widgets.BorderDrawable(layout.getDisplayDensity(), view.toString());
                refreshBorderDrawable(view, <org.nativescript.widgets.BorderDrawable>backgroundDrawable);
                org.nativescript.widgets.ViewHelper.setBackground(nativeView, backgroundDrawable);
            }
            else {
                refreshBorderDrawable(view, <org.nativescript.widgets.BorderDrawable>backgroundDrawable);
            }

            // This should be done only when backgroundImage is set!!!
            if ((background.hasBorderWidth() || background.hasBorderRadius() || background.clipPath) && getSDK() < 18) {
                // Switch to software because of unsupported canvas methods if hardware acceleration is on:
                // http://developer.android.com/guide/topics/graphics/hardware-accel.html
                if (cache.layerType === undefined) {
                    cache.layerType = cache.getLayerType();
                    cache.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);
                }
            }
        }
        else {
            if (_defaultBackgrounds.has(viewClass)) {
                org.nativescript.widgets.ViewHelper.setBackground(nativeView, _defaultBackgrounds.get(viewClass).newDrawable());
            }

            if (cache.layerType !== undefined) {
                cache.setLayerType(cache.layerType, null);
                cache.layerType = undefined;
            }
        }

        // TODO: Can we move BorderWidths as separate native setter?
        // This way we could skip setPadding if borderWidth is not changed.
        let leftPadding = Math.round(view.effectiveBorderLeftWidth + view.effectivePaddingLeft);
        let topPadding = Math.round(view.effectiveBorderTopWidth + view.effectivePaddingTop);
        let rightPadding = Math.round(view.effectiveBorderRightWidth + view.effectivePaddingRight);
        let bottomPadding = Math.round(view.effectiveBorderBottomWidth + view.effectivePaddingBottom);

        nativeView.setPadding(
            leftPadding,
            topPadding,
            rightPadding,
            bottomPadding
        );
    }
}

function refreshBorderDrawable(view: View, borderDrawable: org.nativescript.widgets.BorderDrawable) {
    let background = view.style.backgroundInternal;
    if (background) {
        let backgroundPositionParsedCSSValues: native.Array<org.nativescript.widgets.CSSValue> = null;
        let backgroundSizeParsedCSSValues: native.Array<org.nativescript.widgets.CSSValue> = null;
        if (background.position) {
            backgroundPositionParsedCSSValues = createNativeCSSValueArray(background.position);
        }
        if (background.size) {
            backgroundSizeParsedCSSValues = createNativeCSSValueArray(background.size);
        }

        let blackColor = android.graphics.Color.BLACK;
        borderDrawable.refresh(

            (background.borderTopColor && background.borderTopColor.android !== undefined) ? background.borderTopColor.android : blackColor,
            (background.borderRightColor && background.borderRightColor.android !== undefined) ? background.borderRightColor.android : blackColor,
            (background.borderBottomColor && background.borderBottomColor.android !== undefined) ? background.borderBottomColor.android : blackColor,
            (background.borderLeftColor && background.borderLeftColor.android !== undefined) ? background.borderLeftColor.android : blackColor,

            background.borderTopWidth,
            background.borderRightWidth,
            background.borderBottomWidth,
            background.borderLeftWidth,

            background.borderTopLeftRadius,
            background.borderTopRightRadius,
            background.borderBottomRightRadius,
            background.borderBottomLeftRadius,

            background.clipPath,

            (background.color && background.color.android) ? background.color.android : 0,
            (background.image && background.image.android) ? background.image.android : null,
            background.repeat,
            background.position,
            backgroundPositionParsedCSSValues,
            background.size,
            backgroundSizeParsedCSSValues
        );
        //console.log(`>>> ${borderDrawable.toDebugString()}`);
    }
}

function createNativeCSSValueArray(css: string): native.Array<org.nativescript.widgets.CSSValue> {
    if (!css) {
        return null;
    }

    let cssValues = parse(css);
    let nativeArray = Array.create(org.nativescript.widgets.CSSValue, cssValues.length);
    for (let i = 0, length = cssValues.length; i < length; i++) {
        nativeArray[i] = new org.nativescript.widgets.CSSValue(
            cssValues[i].type,
            cssValues[i].string,
            cssValues[i].unit,
            cssValues[i].value
        );
    }

    return nativeArray;
}
