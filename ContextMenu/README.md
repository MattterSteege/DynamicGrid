# ContextMenu

A customizable and dynamic context menu component for web applications, supporting buttons, separators, submenus, and animated transitions. It allows developers to create complex and flexible menu structures that enhance the user experience in web interfaces.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
    - [Constructor](#constructor)
    - [Methods](#methods)
    - [Static Properties](#static-properties)
- [Customization](#customization)
- [Dependencies](#dependencies)
- [Example HTML](#example-html)
- [License](#license)

## Features

- **Flexible Layout**: Supports buttons, separators, and submenus.
- **Customizable Styles**: Easily adjust layout, positioning, and animations.
- **Keyboard Navigation**: Full support for keyboard shortcuts, including arrow keys and escape.
- **Event Management**: Includes built-in listeners for context menus, clicks, and key presses.
- **Accessible Markup**: Marked-up with `aria` attributes for screen readers.

## Installation

Include the `ContextMenu` script and `ContextMenu.css` styles in your project:

```html
<link rel="stylesheet" href="path/to/ContextMenu.css">
<script src="path/to/ContextMenu.js"></script>
```

Or, if using as an ES6 module:

```javascript
import ContextMenu from './path/to/ContextMenu.js';
```

> **Note**: The provided `ContextMenu.css` is required for basic styling but can be modified to suit your project's design requirements.

## Usage

1. **Initialize the Menu**:
   Create a new instance of `ContextMenu` and configure it by adding buttons, separators, or submenus.

   ```javascript
   const menu = new ContextMenu({
       animationType: 'fade',
       animationDuration: 300
   });
   ```

2. **Add Buttons**:
   Define menu items by adding buttons or submenus, then display the menu at a specific position.

   ```javascript
   menu.addButton({
       text: 'Edit',
       icon: 'edit-icon-class',
       action: () => alert('Edit clicked')
   })
   .addSeparator()
   .addButton({
       text: 'Delete',
       icon: 'delete-icon-class',
       action: () => alert('Delete clicked')
   });
   ```

3. **Show Menu**:
   Trigger the menu at desired coordinates.

   ```javascript
   document.addEventListener('contextmenu', (e) => {
       e.preventDefault();
       menu.showAt(e.clientX, e.clientY);
   });
   ```

## API

### Constructor

```javascript
new ContextMenu(data)
```

| Parameter  | Type   | Description                                                                 |
|------------|--------|-----------------------------------------------------------------------------|
| `data`     | Object | Optional. Configuration object for animation, including `animationDuration`, and `animationTiming`. |

### Methods

- **addButton(button)**: Adds a button to the menu.

   ```javascript
   addButton({
       text: 'Button Text',
       icon: 'button-icon-class',
       action: function
   })
   ```

- **addSeparator()**: Adds a separator to the menu.

- **addSubMenu(submenu)**: Adds a submenu to the menu.

   ```javascript
   addSubMenu({
       text: 'Submenu Text',
       icon: 'submenu-icon-class',
       subMenu: instance of ContextMenu
   })
   ```

- **showAt(x, y)**: Shows the context menu at specific coordinates.

- **destroy()**: Destroys the context menu and removes all event listeners.

### Static Properties

- **CLASSNAMES**: Contains predefined class names and default maximum dimensions.
  ```javascript
  ContextMenu.CLASSNAMES.BUTTON; // 'context-menu-button'
  ```

### Event Handling

- **Keyboard Shortcuts**:
    - `Enter`, `Space`, `ArrowRight`: Opens a submenu.
    - `ArrowUp`, `ArrowDown`: Navigates between menu items.
    - `ArrowLeft`: Goes back to the parent menu.
    - `Escape`: Closes the menu.

## Customization

Customize the menu appearance and behavior by modifying the `animation` properties within the constructor and the styling in the CSS file.

### Style Options

| Property          | Type   | Description                                                |
|-------------------|--------|------------------------------------------------------------|
| `initialYOffset`  | Number | Offset in pixels from the top of the anchor element.       |
| `initialXOffset`  | Number | Offset in pixels from the left of the anchor element.      |

### Animation Options

| Property            | Type   | Description                                               |
|---------------------|--------|-----------------------------------------------------------|
| `animationDuration` | Number | Duration of the animation in milliseconds.                |
| `animationTiming`   | String | CSS timing function for the animation (e.g., `ease-out`). |

## Dependencies

The `ContextMenu` class has no external dependencies and is written in pure JavaScript.

## Example HTML

Below is an example of how to set up an HTML page with `ContextMenu` integration. This includes importing the necessary JavaScript and CSS files, and setting up a trigger to show the context menu.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ContextMenu Example</title>
    <link rel="stylesheet" href="path/to/ContextMenu.css">
</head>
<body>

<div id="content">
    Right-click anywhere in this area to see the context menu.
</div>

<script src="path/to/ContextMenu.js"></script>
<script>
    // Initialize and configure the context menu
    const menu = new ContextMenu({
        animationType: 'fade',
        animationDuration: 200,
        animationTiming: 'ease-out'
    });

    menu.addButton({
        text: 'Edit',
        icon: 'edit-icon',
        action: () => alert('Edit selected')
    })
    .addSeparator()
    .addButton({
        text: 'Delete',
        icon: 'delete-icon',
        action: () => alert('Delete selected')
    });

    // Display the context menu on right-click within #content
    document.getElementById('content').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        menu.showAt(e.clientX, e.clientY);
    });
</script>

</body>
</html>
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.