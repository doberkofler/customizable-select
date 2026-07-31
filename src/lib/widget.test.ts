import {afterEach, describe, expect, it, vi} from 'vitest';

import {
	CustomizableSelect,
	createCustomizableSelect,
	destroyCustomizableSelect,
	getCustomizableSelect,
	type CustomizableSelectOption,
	type CustomizableSelectOptions,
} from './widget.ts';

type Metadata = {readonly color: string};

const OPTIONS: readonly CustomizableSelectOption<Metadata>[] = [
	{id: 1, text: 'Alpha', data: {color: 'red'}},
	{id: 'beta', text: 'Béta', data: {color: 'blue'}},
	{id: 'locked', text: 'Locked', locked: true, data: {color: 'gray'}},
	{id: 'disabled', text: 'Disabled', disabled: true, data: {color: 'gray'}},
];
const SINGLE_OPTIONS = OPTIONS.filter((option) => !option.locked);

const mounted: CustomizableSelect[] = [];

function queryRequired(root: ParentNode, selector: string): Element {
	const element = root.querySelector(selector);
	if (element === null) {
		throw new Error(`Missing test element: ${selector}`);
	}
	return element;
}

function createSelect(multiple = false): HTMLSelectElement {
	const source = document.createElement('select');
	source.multiple = multiple;
	source.innerHTML = '<option value="1">Alpha</option><option value="beta">Béta</option><option value="locked">Locked</option>';
	document.body.append(source);
	return source;
}

function mount<TData = Metadata>(
	source: HTMLInputElement | HTMLSelectElement = createSelect(),
	options: CustomizableSelectOptions<TData> = {},
): CustomizableSelect<TData> {
	const instance = new CustomizableSelect<TData>(source, options);
	mounted.push(instance as CustomizableSelect);
	return instance;
}

describe('CustomizableSelect', () => {
	afterEach(() => {
		for (const instance of mounted.splice(0)) {
			instance.destroy();
		}
		document.body.replaceChildren();
	});

	it('enhances a select and reads its initial value', () => {
		const source = createSelect();
		source.setAttribute('aria-label', 'Framework');
		source.value = 'beta';
		const instance = mount(source);

		expect(instance.getValue()).toBe('beta');
		expect(instance.element.dataset['component']).toBe('CustomizableSelect');
		expect(source.classList.contains('customizable-select__source')).toBe(true);
		expect(instance.element.querySelector('.customizable-select__selection')?.getAttribute('aria-label')).toBe('Framework');
		expect(instance.element.querySelector('.customizable-select__search')?.getAttribute('role')).toBe('searchbox');
		instance.open();
		expect(instance.element.querySelector('.customizable-select__search')?.getAttribute('role')).toBe('combobox');
		expect(instance.element.querySelector('.customizable-select__selection')?.getAttribute('role')).toBeNull();
		expect(instance.element.querySelector('.customizable-select__value')?.textContent).toBe('Béta');
	});

	it('synchronizes after native form reset', async () => {
		const form = document.createElement('form');
		const source = createSelect();
		source.value = 'beta';
		form.append(source);
		document.body.append(form);
		const instance = mount(source, {options: SINGLE_OPTIONS});
		instance.setValue('1');

		form.reset();

		await vi.waitFor(() => {
			expect(instance.getValue()).toBe('beta');
		});
	});

	it('preserves the form reset value when options are replaced', async () => {
		const form = document.createElement('form');
		const source = createSelect();
		source.value = 'beta';
		form.append(source);
		document.body.append(form);
		const instance = mount(source, {options: SINGLE_OPTIONS});
		instance.setValue('1');
		instance.setOptions([...SINGLE_OPTIONS]);

		form.reset();

		await vi.waitFor(() => {
			expect(instance.getValue()).toBe('beta');
		});
	});

	it('normalizes ids, rejects duplicates, and preserves typed metadata', () => {
		const source = createSelect();
		const instance = mount(source, {options: SINGLE_OPTIONS});
		instance.setValue(1);

		expect(instance.getValue()).toBe('1');
		expect(instance.getSelectedOptions()).toStrictEqual([OPTIONS[0]]);
		expect(() => {
			instance.setOptions([
				{id: 1, text: 'One'},
				{id: '1', text: 'Duplicate'},
			]);
		}).toThrow('Duplicate CustomizableSelect option id: 1');
	});

	it('supports multiple input values and custom serialization', () => {
		const source = document.createElement('input');
		source.value = '1|beta';
		document.body.append(source);
		const instance = mount(source, {
			options: OPTIONS,
			multiple: true,
			parseInputValue: (value) => value.split('|'),
			serializeInputValue: (values) => values.join('|'),
		});

		expect(instance.getValues()).toStrictEqual(['locked', '1', 'beta']);
		instance.setValue(['beta', 1]);
		expect(source.value).toBe('locked|beta|1');
	});

	it('keeps locked options and filters unknown values by default', () => {
		const instance = mount(createSelect(true), {options: OPTIONS, multiple: true});
		instance.setValue(['missing', 'beta']);

		expect(instance.getValues()).toStrictEqual(['locked', 'beta']);
		instance.setValue(['missing'], {allowUnknownValue: true});
		expect(instance.getValues()).toStrictEqual(['locked', 'missing']);
	});

	it('submits allowed unknown select values through the native source', () => {
		const form = document.createElement('form');
		const source = createSelect();
		source.name = 'framework';
		form.append(source);
		document.body.append(form);
		const instance = mount(source, {options: SINGLE_OPTIONS, allowUnknownValue: true});
		instance.setValue('remote-value');

		expect(source.value).toBe('remote-value');
		expect(new FormData(form).get('framework')).toBe('remote-value');
		expect(instance.getSelectedOptions()).toStrictEqual([]);
	});

	it('reconciles values after an external multiple-state change', async () => {
		const source = createSelect(true);
		const instance = mount(source, {options: SINGLE_OPTIONS, multiple: true});
		instance.setValue(['1', 'beta']);

		source.multiple = false;

		await vi.waitFor(() => {
			expect(instance.getValue()).toBe('1');
		});
	});

	it('opens, searches with diacritic folding, and selects through the active option', () => {
		const instance = mount(createSelect(), {options: SINGLE_OPTIONS});
		instance.open();
		const search = queryRequired(instance.element, '.customizable-select__search') as HTMLInputElement;
		search.value = 'beta';
		search.dispatchEvent(new Event('input', {bubbles: true}));

		expect(instance.element.querySelectorAll('.customizable-select__option')).toHaveLength(1);
		search.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
		expect(instance.getValue()).toBe('beta');
		expect(instance.element.querySelector<HTMLDivElement>('.customizable-select__dropdown')?.hidden).toBe(true);
	});

	it('supports arrow, Home, End, and Escape keyboard behavior', () => {
		const instance = mount(createSelect(), {options: SINGLE_OPTIONS});
		const selection = queryRequired(instance.element, '.customizable-select__selection') as HTMLDivElement;
		selection.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
		const search = queryRequired(instance.element, '.customizable-select__search') as HTMLInputElement;
		search.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
		expect(instance.element.querySelector<HTMLElement>(`#${search.getAttribute('aria-activedescendant') ?? ''}`)?.dataset['optionId']).toBe('beta');
		search.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
		expect(instance.element.querySelector<HTMLElement>(`#${search.getAttribute('aria-activedescendant') ?? ''}`)?.dataset['optionId']).toBe('1');
		search.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
		expect(document.activeElement).toBe(selection);
	});

	it('dispatches native and typed change events for user changes', () => {
		const source = createSelect();
		const instance = mount(source, {options: SINGLE_OPTIONS});
		const nativeChange = vi.fn<(event: Event) => void>();
		const componentChange = vi.fn<(event: CustomEvent) => void>();
		source.addEventListener('change', (event) => {
			nativeChange(event);
		});
		instance.addEventListener('customizable-select:change', (event) => {
			componentChange(event);
		});
		instance.open();
		instance.element.querySelector<HTMLElement>('[data-option-id="beta"]')?.click();

		expect(nativeChange.mock.calls[0]?.[0]).toBeInstanceOf(Event);
		expect(componentChange.mock.calls[0]?.[0].detail).toMatchObject({value: 'beta', values: ['beta'], userInitiated: true});
	});

	it('synchronizes external native changes', () => {
		const source = createSelect();
		const instance = mount(source);
		source.value = 'beta';
		source.dispatchEvent(new Event('change', {bubbles: true}));

		expect(instance.getValue()).toBe('beta');
	});

	it('uses custom filtering and rendering hooks', () => {
		const instance = mount(createSelect(), {
			options: SINGLE_OPTIONS,
			filterOption: (option) => option.data?.color === 'blue',
			renderOption: ({option}) => `Option: ${option.text}`,
			renderSelection: ({option}) => `Selected: ${option.text}`,
		});
		instance.setValue('beta');
		instance.open();

		expect(instance.element.querySelector('.customizable-select__option')?.textContent).toBe('Option: Béta');
		expect(instance.element.querySelector('.customizable-select__value')?.textContent).toBe('Selected: Béta');
	});

	it('guards disabled and readonly controls', () => {
		const source = document.createElement('input');
		document.body.append(source);
		const instance = mount(source, {options: OPTIONS});
		instance.setDisabled(true);
		instance.open();
		expect(instance.element.querySelector<HTMLDivElement>('.customizable-select__dropdown')?.hidden).toBe(true);
		expect(instance.element.querySelector('.customizable-select__selection')?.getAttribute('aria-disabled')).toBe('true');

		instance.setDisabled(false);
		instance.setReadOnly(true);
		instance.open();
		expect(instance.element.querySelector<HTMLDivElement>('.customizable-select__dropdown')?.hidden).toBe(true);
	});

	it('restores the source on destruction', () => {
		const source = createSelect();
		source.className = 'original';
		const originalMarkup = source.innerHTML;
		const instance = mount(source, {options: SINGLE_OPTIONS, disabled: true});
		instance.setValue('beta');
		instance.destroy();

		expect(source.className).toBe('original');
		expect(source.disabled).toBe(false);
		expect(source.getAttribute('aria-hidden')).toBeNull();
		expect(source.innerHTML).toBe(originalMarkup);
		expect(source.value).toBe('beta');
		expect(() => instance.getValue()).toThrow('CustomizableSelect instance has been destroyed');
	});

	it('registers, retrieves, replaces, and destroys factory instances', () => {
		const source = createSelect();
		const first = createCustomizableSelect(source);
		const second = createCustomizableSelect(source);
		mounted.push(second);

		expect(() => first.getValue()).toThrow('CustomizableSelect instance has been destroyed');
		expect(getCustomizableSelect(source)).toBe(second);
		destroyCustomizableSelect(source);
		expect(getCustomizableSelect(source)).toBeUndefined();
	});
});
