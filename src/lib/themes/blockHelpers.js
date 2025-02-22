import {BLOCKS_THREE} from '.';

const getBlockIconURI = extensionIcons => {
    if (!extensionIcons) return null;

    return extensionIcons.blockIconURI || extensionIcons.menuIconURI;
};

const getCategoryIconURI = extensionIcons => {
    if (!extensionIcons) return null;

    return extensionIcons.menuIconURI || extensionIcons.blockIconURI;
};

// scratch-blocks colours has a pen property that scratch-gui uses for all extensions
const getExtensionColors = theme => theme.getBlockColors().pen;

const DEFAULT_EXTENSION_PRIMARY = '#0fbd8c';

/**
 * Applies extension color theme to categories.
 * No changes are applied if called with the default theme, allowing extensions to provide their own colors.
 * These colors are not seen if the category provides a blockIconURI.
 * @param {Array.<object>} dynamicBlockXML - XML for each category of extension blocks, returned from getBlocksXML
 * in the vm runtime.
 * @param {Theme} theme - Theme name
 * @returns {Array.<object>} Dynamic block XML updated with colors.
 */
const injectExtensionCategoryTheme = (dynamicBlockXML, theme) => {
    // Minor optimization -- don't do anything at all for the default theme.
    if (theme.blocks === BLOCKS_THREE) return dynamicBlockXML;

    const extensionColors = getExtensionColors(theme);
    const extensionIcons = theme.getExtensions();
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    return dynamicBlockXML.map(extension => {
        const dom = parser.parseFromString(extension.xml, 'text/xml');

        const primaryColor = dom.documentElement.getAttribute('colour');
        const usesCustomColors = primaryColor.toLowerCase() !== DEFAULT_EXTENSION_PRIMARY;
        if (usesCustomColors) {
            const converters = theme.getCustomExtensionColors();
            dom.documentElement.setAttribute('colour', converters.categoryIconBackground(primaryColor));
            dom.documentElement.setAttribute('secondaryColour', converters.categoryIconBorder(primaryColor));
        } else {
            dom.documentElement.setAttribute('colour', extensionColors.primary);
            // Note: the category's secondaryColour matches up with the blocks' tertiary color,
            // both used for border color.
            dom.documentElement.setAttribute('secondaryColour', extensionColors.tertiary);
        }

        const categoryIconURI = getCategoryIconURI(extensionIcons[extension.id]);
        if (categoryIconURI) {
            dom.documentElement.setAttribute('iconURI', categoryIconURI);
        }

        return {
            ...extension,
            xml: serializer.serializeToString(dom)
        };
    });
};

const injectBlockIcons = (blockInfoJson, theme) => {
    // Block icons are the first element of `args0`
    if (!blockInfoJson.args0 || blockInfoJson.args0.length < 1 ||
        blockInfoJson.args0[0].type !== 'field_image') return blockInfoJson;

    const extensionIcons = theme.getExtensions();
    const extensionId = blockInfoJson.type.substring(0, blockInfoJson.type.indexOf('_'));
    const blockIconURI = getBlockIconURI(extensionIcons[extensionId]);

    if (!blockIconURI) return blockInfoJson;

    return {
        ...blockInfoJson,
        args0: blockInfoJson.args0.map((value, index) => {
            if (index !== 0) return value;

            return {
                ...value,
                src: blockIconURI
            };
        })
    };
};

/**
 * Applies extension color theme to static block json.
 * No changes are applied if called with the default theme, allowing extensions to provide their own colors.
 * @param {object} blockInfoJson - Static block json
 * @param {Theme} theme - Theme name
 * @returns {object} Block info json with updated colors. The original blockInfoJson is not modified.
 */
const injectExtensionBlockTheme = (blockInfoJson, theme) => {
    // Minor optimization -- don't do anything at all for the default theme.
    if (theme.blocks === BLOCKS_THREE) return blockInfoJson;

    const usesCustomColors = blockInfoJson.colour && blockInfoJson.colour.toLowerCase() !== DEFAULT_EXTENSION_PRIMARY;
    if (usesCustomColors) {
        const converters = theme.getCustomExtensionColors();
        return {
            ...blockInfoJson,
            colour: converters.primary(blockInfoJson.colour),
            colourSecondary: converters.secondary(blockInfoJson.colour),
            colourTertiary: converters.tertiary(blockInfoJson.colour),
            colourQuaternary: converters.quaternary(blockInfoJson.colour)
        };
    }

    const extensionColors = getExtensionColors(theme);

    return {
        ...injectBlockIcons(blockInfoJson, theme),
        colour: extensionColors.primary,
        colourSecondary: extensionColors.secondary,
        colourTertiary: extensionColors.tertiary,
        colourQuaternary: extensionColors.quaternary
    };
};

export {
    injectExtensionBlockTheme,
    injectExtensionCategoryTheme
};
