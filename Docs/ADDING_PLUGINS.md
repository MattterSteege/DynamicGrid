# 🔌 Writing Your Own Type Plugin (For Real)

This guide walks you through **how to create your own Type Plugin**, how to register it, and what you absolutely MUST implement for it not to silently fail or blow up in your face. Based on real frustrations, not theory.

---

## ⚙️ What Is a Type Plugin?

A Type Plugin controls how a column **validates data, parses input, evaluates filter logic, builds UI**, and shows context menu options.

All plugins extend `BaseTypePlugin` and are expected to override a few methods. If you skip them? You'll get runtime errors — *and you'll deserve them*.

---

## 📦 Step-by-Step: How to Build One

```js
class MyCustomTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '>', '<']; // define supported operators
        this.sortingHint = 'number'; // or 'string', 'boolean', 'date'
    }

    validate(value) {
        return typeof value === 'number' && !isNaN(value);
    }

    parseValue(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '>': return dataValue > compareValue;
            case '<': return dataValue < compareValue;
            case '==': return dataValue === compareValue;
            case '!=': return dataValue !== compareValue;
            default: return false;
        }
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue ?? '';
        input.addEventListener('input', (e) => onChange(e.target.value));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'filter',
                label: 'Filter',
                operators: this.operators
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ];
    }
}
````

---

## 🧠 What You MUST Implement

| Method                     | Required                   | Description                                          |
| -------------------------- | -------------------------- | ---------------------------------------------------- |
| `validate(value)`          | ✅                          | Returns true if the value is valid                   |
| `parseValue(value)`        | ✅                          | Converts raw value into parsed form                  |
| `evaluateCondition(...)`   | ✅                          | Handles logic for operators other than `==` and `!=` |
| `getInputComponent(...)`   | Optional (but recommended) | Returns an `<input>` or similar UI element           |
| `getContextMenuItems(...)` | Optional                   | Defines filtering/sorting/actions per column         |

---

## 🧾 How to Register Your Plugin

Assuming you have an `SJQLEngine` instance:

```js
engine.registerTypePlugin('myNumber', new MyCustomTypePlugin());
```

Then when defining a column:

```js
engine.addColumn('Price', { plugin: 'myNumber' });
```

If you don't set a plugin explicitly, the engine will try to guess. And it often guesses wrong.

---

## ⚠️ Things That Will Blow Up If You Forget

* `this.operators` must exactly match what `evaluateCondition()` can handle.
* `parseValue()` must return values that work with your evaluation logic.
* `getContextMenuItems()` must define filters or sorts, or the UI will show\... nothing.
* If you include `><` (between), make sure you know it maps to **two filters**: `>= left` and `<= right`. This is handled in `ColumnContextMenu.js`.

---

## 🧪 Example: The `NumberTypePlugin`

See `NumberTypePlugin.js`.

* Operators: `['>', '<', '>=', '<=', '><']`
* `parseValue()` uses `parseFloat`
* Adds a `Calculate Stats` context menu action
* Defines input as numeric with `input.pattern = \d*` (clever mobile support)

---

## 🤖 How the Context Menu Works

The column header context menu calls `plugin.getContextMenuItems(...)` to get filter/sort/action options.

Example return value:

```js
return [
    {
        type: 'filter',
        label: 'Filter',
        operators: ['==', '!=', '><']
    },
    {
        type: 'sort',
        label: 'Sort',
        sortingHint: 'number'
    },
    {
        type: 'action',
        label: 'Do Something',
        action: () => this.doSomethingSpecial()
    }
];
```

**If you don't provide filter items, filtering won't appear. Your plugin is responsible.**

---

## 🧨 Common Mistakes

* Forgetting to implement `evaluateCondition()` → hard crash.
* Declaring unsupported operators → silent failure.
* Inconsistent parsing (e.g. `"12abc"` becomes `NaN`) → filters silently break.
* Not implementing `getInputComponent()` → default input appears, which may not work as expected.

---

## ✅ Plugin Builder Checklist

* [ ] Inherit from `BaseTypePlugin`
* [ ] Implement `validate(value)`
* [ ] Implement `parseValue(value)`
* [ ] Implement `evaluateCondition(dataValue, operator, compareValue)`
* [ ] (Optional) Implement `getInputComponent(...)`
* [ ] (Optional) Add `getContextMenuItems(...)` with filters/sorts/actions
* [ ] Register plugin via `engine.registerTypePlugin(...)`
* [ ] Assign plugin to column via `plugin: 'yourPluginName'`
