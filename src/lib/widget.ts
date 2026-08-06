/** Controls the component color scheme. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** A value accepted as an option identifier. Values are normalized to strings. */
export type CustomizableSelectValue = string | number;

/** An option displayed by {@link CustomizableSelect}. */
export type CustomizableSelectOption<TData = unknown> = {
	/** Stable identifier. Numeric IDs are normalized to strings for values and DOM synchronization. */
	readonly id: CustomizableSelectValue;
	/** Plain-text label used by default renderers and local filtering. */
	readonly text: string;
	/** Prevents user selection while keeping the option visible. */
	readonly disabled?: boolean;
	/** Forces the option to remain selected during value updates and clear operations. */
	readonly locked?: boolean;
	/** Application metadata passed through getters, events, filters, and renderers. */
	readonly data?: TData;
};

/** Localized text rendered by the component. */
export type CustomizableSelectMessages = {
	/** Accessible label for the clear button. */
	readonly clear: string;
	/** Text displayed when local filtering has no matches. */
	readonly noResults: string;
	/** Creates an accessible label for a selected-value removal button. */
	readonly remove: (optionText: string) => string;
	/** Accessible label for the local-search input. */
	readonly search: string;
};

/** Returns whether an option should be included for a local search query. */
export type CustomizableSelectFilter<TData = unknown> = (option: CustomizableSelectOption<TData>, query: string) => boolean;

/** State supplied to a custom result renderer. */
export type CustomizableSelectRenderOptionContext<TData> = {
	/** Whether keyboard navigation currently points to this option. */
	readonly active: boolean;
	readonly option: CustomizableSelectOption<TData>;
	readonly query: string;
	readonly selected: boolean;
};

/** State supplied to a custom selected-value renderer. */
export type CustomizableSelectRenderSelectionContext<TData> = {
	readonly multiple: boolean;
	readonly option: CustomizableSelectOption<TData>;
};

/** Renders trusted application content as plain text or a DOM node. */
export type CustomizableSelectRenderer<TContext> = (context: TContext) => Node | string;

/** Controls whether a programmatic value update emits change events. */
export type CustomizableSelectSetValueOptions = {
	/** Dispatches native and component change events when true. Defaults to false. */
	readonly dispatchChange?: boolean;
	/** Overrides unknown-value handling for this update. */
	readonly allowUnknownValue?: boolean;
};

/** Snapshot delivered with component change and clear events. */
export type CustomizableSelectChangeDetail<TData = unknown> = {
	/** A string or null in single mode and a readonly array in multiple mode. */
	readonly value: string | readonly string[] | null;
	readonly values: readonly string[];
	readonly selectedOptions: readonly CustomizableSelectOption<TData>[];
	readonly userInitiated: boolean;
};

/** Strongly typed lifecycle and selection events emitted by an instance. */
export type CustomizableSelectEventMap<TData = unknown> = {
	'customizable-select:change': CustomEvent<CustomizableSelectChangeDetail<TData>>;
	'customizable-select:clear': CustomEvent<CustomizableSelectChangeDetail<TData>>;
	'customizable-select:close': CustomEvent<void>;
	'customizable-select:open': CustomEvent<void>;
	'customizable-select:select': CustomEvent<CustomizableSelectOption<TData>>;
	'customizable-select:unselect': CustomEvent<CustomizableSelectOption<TData>>;
};

/** Configuration for a native input- or select-backed component. */
export type CustomizableSelectOptions<TData = unknown> = {
	/** Options to display. Select elements use their native options when omitted. */
	readonly options?: readonly CustomizableSelectOption<TData>[];
	/** Enables multiple selection. Defaults to the native select state. */
	readonly multiple?: boolean;
	/** Text rendered when no known option is selected. */
	readonly placeholder?: string;
	/** Shows the local-search field. Defaults to true. */
	readonly searchable?: boolean;
	/** Shows clear and removable-value controls. Defaults to true. */
	readonly allowClear?: boolean;
	/** Closes after selection. Defaults to true in single mode and false in multiple mode. */
	readonly closeOnSelect?: boolean;
	/** Retains IDs absent from the local option set. Defaults to false. */
	readonly allowUnknownValue?: boolean;
	/** Initial disabled state, synchronized to the native source. */
	readonly disabled?: boolean;
	/** Initial readonly state. Select sources enforce it through the generated control. */
	readonly readOnly?: boolean;
	/** Additional class added to the generated root element. */
	readonly className?: string;
	/** Controls the component color scheme. Defaults to system. */
	readonly theme?: ThemeMode;
	/** Localized message overrides. */
	readonly messages?: Partial<CustomizableSelectMessages>;
	/** Parses an input element's value. The default uses comma-separated values in multiple mode. */
	readonly parseInputValue?: (value: string, multiple: boolean) => readonly CustomizableSelectValue[];
	/** Serializes values into an input element. The default joins multiple values with commas. */
	readonly serializeInputValue?: (values: readonly string[], multiple: boolean) => string;
	/** Replaces diacritic-insensitive substring filtering. */
	readonly filterOption?: CustomizableSelectFilter<TData>;
	/** Replaces result content without accepting unsafe HTML strings. */
	readonly renderOption?: CustomizableSelectRenderer<CustomizableSelectRenderOptionContext<TData>>;
	/** Replaces selected-value content without accepting unsafe HTML strings. */
	readonly renderSelection?: CustomizableSelectRenderer<CustomizableSelectRenderSelectionContext<TData>>;
};

type NormalizedOption<TData> = CustomizableSelectOption<TData> & {
	readonly key: string;
};

type SourceSnapshot = {
	readonly ariaHidden: string | null;
	readonly className: string;
	readonly disabled: boolean;
	readonly inputReadOnly: boolean | null;
	readonly multiple: boolean | null;
	readonly selectContents: readonly Node[] | null;
	readonly tabIndex: string | null;
};

const DEFAULT_MESSAGES: CustomizableSelectMessages = {
	clear: 'Clear selection',
	noResults: 'No results found',
	remove: (optionText) => `Remove ${optionText}`,
	search: 'Search options',
};

let instanceCounter = 0;
const instances = new WeakMap<HTMLInputElement | HTMLSelectElement, CustomizableSelect>();

function defaultParseInputValue(value: string, multiple: boolean): readonly string[] {
	if (value === '') {
		return [];
	}
	return multiple ? value.split(',') : [value];
}

function defaultSerializeInputValue(values: readonly string[], multiple: boolean): string {
	return multiple ? values.join(',') : (values[0] ?? '');
}

function defaultFilter<TData>(option: CustomizableSelectOption<TData>, query: string): boolean {
	const normalize = (value: string): string =>
		value
			.normalize('NFD')
			.replaceAll(/[\u0300-\u036f]/gu, '')
			.toLocaleLowerCase();
	return normalize(option.text).includes(normalize(query));
}

function appendRenderedContent(element: HTMLElement, content: Node | string): void {
	if (typeof content === 'string') {
		element.textContent = content;
		return;
	}
	element.append(content);
}

function getSourceOptions<TData>(source: HTMLSelectElement): CustomizableSelectOption<TData>[] {
	return [...source.options].map((option) => ({
		id: option.value,
		text: option.text,
		disabled: option.disabled,
		locked: Object.hasOwn(option.dataset, 'locked') || option.hasAttribute('locked'),
	}));
}

function toPublicOption<TData>(option: NormalizedOption<TData>): CustomizableSelectOption<TData> {
	return {
		id: option.id,
		text: option.text,
		...(option.disabled === undefined ? {} : {disabled: option.disabled}),
		...(option.locked === undefined ? {} : {locked: option.locked}),
		...(option.data === undefined ? {} : {data: option.data}),
	};
}

function normalizeOptions<TData>(options: readonly CustomizableSelectOption<TData>[]): NormalizedOption<TData>[] {
	const keys = new Set<string>();
	return options.map((option) => {
		const key = String(option.id);
		if (key === '') {
			throw new TypeError('CustomizableSelect option ids must not be empty');
		}
		if (keys.has(key)) {
			throw new Error(`Duplicate CustomizableSelect option id: ${key}`);
		}
		if (typeof option.text !== 'string') {
			throw new TypeError(`CustomizableSelect option ${key} must have string text`);
		}
		keys.add(key);
		return {...option, key};
	});
}

function resolveTarget(target: string | HTMLInputElement | HTMLSelectElement): HTMLInputElement | HTMLSelectElement {
	const source = typeof target === 'string' ? document.querySelector(target) : target;
	if (!(source instanceof HTMLInputElement) && !(source instanceof HTMLSelectElement)) {
		throw new TypeError('CustomizableSelect target must be an input or select element');
	}
	return source;
}

/**
 * Dependency-free, accessible select enhancement for native input and select elements.
 *
 * The native source remains synchronized for form submission. Call {@link destroy} to
 * remove the generated UI and restore the source's original presentation.
 */
export class CustomizableSelect<TData = unknown> {
	/** Generated component root inserted immediately after {@link source}. */
	public readonly element: HTMLDivElement;
	/** Native form control enhanced by this instance. */
	public readonly source: HTMLInputElement | HTMLSelectElement;

	readonly #selection: HTMLDivElement;
	readonly #dropdown: HTMLDivElement;
	readonly #searchInput: HTMLInputElement;
	readonly #results: HTMLUListElement;
	readonly #optionsConfig: CustomizableSelectOptions<TData>;
	readonly #messages: CustomizableSelectMessages;
	readonly #snapshot: SourceSnapshot;
	readonly #eventController = new AbortController();
	readonly #observer: MutationObserver;
	#options: NormalizedOption<TData>[];
	#values: string[] = [];
	#multiple: boolean;
	#disabled: boolean;
	#readOnly: boolean;
	#open = false;
	#destroyed = false;
	#query = '';
	#activeKey: string | null = null;
	#syncingSource = false;

	/**
	 * Creates an enhancement without adding it to the factory registry.
	 * @param source Native form control to enhance.
	 * @param options Component configuration.
	 */
	public constructor(source: HTMLInputElement | HTMLSelectElement, options: CustomizableSelectOptions<TData> = {}) {
		this.source = source;
		const initialSourceValues =
			source instanceof HTMLSelectElement
				? [...source.selectedOptions].map((option) => option.value)
				: (options.parseInputValue ?? defaultParseInputValue)(source.value, options.multiple ?? false).map(String);
		this.#optionsConfig = options;
		this.#messages = {...DEFAULT_MESSAGES, ...options.messages};
		this.#multiple = options.multiple ?? (source instanceof HTMLSelectElement && source.multiple);
		this.#disabled = options.disabled ?? source.disabled;
		this.#readOnly = options.readOnly ?? (source instanceof HTMLInputElement && source.readOnly);
		this.#snapshot = this.#createSnapshot();
		if (options.disabled !== undefined) {
			source.disabled = options.disabled;
		}
		if (source instanceof HTMLInputElement && options.readOnly !== undefined) {
			source.readOnly = options.readOnly;
		}
		if (source instanceof HTMLSelectElement && options.multiple !== undefined) {
			source.multiple = options.multiple;
		}
		this.#options = normalizeOptions(options.options ?? (source instanceof HTMLSelectElement ? getSourceOptions<TData>(source) : []));

		if (!this.#multiple && this.#options.filter((option) => option.locked).length > 1) {
			throw new Error('Single-select CustomizableSelect cannot contain multiple locked options');
		}

		const idPrefix = `customizable-select-${++instanceCounter}`;
		this.element = document.createElement('div');
		this.element.className = ['customizable-select', options.className].filter(Boolean).join(' ');
		this.element.dataset['component'] = 'CustomizableSelect';

		this.#selection = document.createElement('div');
		this.#selection.id = `${idPrefix}-selection`;
		this.#selection.className = 'customizable-select__selection';
		this.#selection.role = 'combobox';
		this.#selection.tabIndex = 0;
		this.#selection.setAttribute('aria-haspopup', 'listbox');
		this.#selection.setAttribute('aria-controls', `${idPrefix}-results`);
		this.#selection.setAttribute('aria-expanded', 'false');
		this.#selection.setAttribute(
			'aria-label',
			source.getAttribute('aria-label') ??
				source.labels?.[0]?.textContent?.trim() ??
				options.placeholder ??
				source.getAttribute('placeholder') ??
				'Select options',
		);
		this.#selection.setAttribute('aria-required', String(source.required));

		this.#dropdown = document.createElement('div');
		this.#dropdown.className = 'customizable-select__dropdown';
		this.#dropdown.hidden = true;

		this.#searchInput = document.createElement('input');
		this.#searchInput.className = 'customizable-select__search';
		this.#searchInput.type = 'search';
		this.#searchInput.autocomplete = 'off';
		this.#searchInput.setAttribute('role', 'searchbox');
		this.#searchInput.setAttribute('aria-label', this.#messages.search);
		this.#searchInput.setAttribute('aria-controls', `${idPrefix}-results`);
		this.#searchInput.setAttribute('aria-expanded', 'false');
		this.#searchInput.setAttribute('aria-haspopup', 'listbox');
		this.#searchInput.setAttribute('aria-autocomplete', 'list');

		this.#results = document.createElement('ul');
		this.#results.id = `${idPrefix}-results`;
		this.#results.className = 'customizable-select__results';
		this.#results.role = 'listbox';
		this.#results.setAttribute('aria-labelledby', this.#selection.id);
		if (this.#multiple) {
			this.#results.setAttribute('aria-multiselectable', 'true');
		}

		this.#dropdown.append(this.#searchInput, this.#results);
		this.element.append(this.#selection, this.#dropdown);
		this.source.insertAdjacentElement('afterend', this.element);
		this.#applyTheme();
		this.source.classList.add('customizable-select__source');
		this.source.setAttribute('aria-hidden', 'true');
		this.source.tabIndex = -1;

		if (options.options !== undefined && source instanceof HTMLSelectElement) {
			this.#writeSelectOptions(initialSourceValues);
		}
		this.#setValues(initialSourceValues, false, false);
		this.#bindEvents();
		this.#observer = new MutationObserver(() => {
			this.#syncSourceState();
		});
		this.#observer.observe(this.source, {attributes: true, attributeFilter: ['disabled', 'readonly', 'required', 'multiple', 'placeholder']});
		this.#render();
	}

	/**
	 * Registers a typed component-event listener.
	 * @param type Component event name.
	 * @param listener Listener receiving the event type associated with the name.
	 * @param options Native event-listener options.
	 */
	public addEventListener<K extends keyof CustomizableSelectEventMap<TData>>(
		type: K,
		listener: (event: CustomizableSelectEventMap<TData>[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void {
		this.element.addEventListener(type, listener as EventListener, options);
	}

	/**
	 * Removes a typed component-event listener.
	 * @param type Component event name.
	 * @param listener Previously registered listener.
	 * @param options Native event-listener options.
	 */
	public removeEventListener<K extends keyof CustomizableSelectEventMap<TData>>(
		type: K,
		listener: (event: CustomizableSelectEventMap<TData>[K]) => void,
		options?: boolean | EventListenerOptions,
	): void {
		this.element.removeEventListener(type, listener as EventListener, options);
	}

	/** Opens the dropdown unless the component is disabled or readonly. */
	public open(): void {
		this.#assertActive();
		if (this.#disabled || this.#readOnly || this.#open) {
			return;
		}
		this.#open = true;
		this.#query = '';
		this.#searchInput.value = '';
		this.#activeKey = this.#firstEnabledKey();
		this.#render();
		this.#dispatch('customizable-select:open');
		if (this.#optionsConfig.searchable ?? true) {
			this.#searchInput.focus();
		}
	}

	/** Closes the dropdown and emits the close event when it was open. */
	public close(): void {
		this.#assertActive();
		if (!this.#open) {
			return;
		}
		this.#open = false;
		this.#renderOpenState();
		this.#dispatch('customizable-select:close');
	}

	/** Moves focus to the visible combobox. */
	public focus(): void {
		this.#assertActive();
		this.#selection.focus();
	}

	/**
	 * Replaces all local options while retaining valid current values.
	 * @param options New local option set.
	 */
	public setOptions(options: readonly CustomizableSelectOption<TData>[]): void {
		this.#assertActive();
		const resetValues =
			this.source instanceof HTMLSelectElement ? [...this.source.options].filter((option) => option.defaultSelected).map((option) => option.value) : [];
		const normalizedOptions = normalizeOptions(options);
		if (!this.#multiple && normalizedOptions.filter((option) => option.locked).length > 1) {
			throw new Error('Single-select CustomizableSelect cannot contain multiple locked options');
		}
		this.#options = normalizedOptions;
		if (this.source instanceof HTMLSelectElement) {
			this.#writeSelectOptions(this.#values, resetValues);
		}
		this.#setValues(this.#values, false, false);
	}

	/** @returns A copy of the current typed option set. */
	public getOptions(): readonly CustomizableSelectOption<TData>[] {
		this.#assertActive();
		return this.#options.map(toPublicOption);
	}

	/**
	 * Replaces the current value after string normalization and locked-value enforcement.
	 * @param value New single or multiple value.
	 * @param options Per-update event and unknown-value behavior.
	 */
	public setValue(value: CustomizableSelectValue | readonly CustomizableSelectValue[] | null, options: CustomizableSelectSetValueOptions = {}): void {
		this.#assertActive();
		const values = value === null ? [] : Array.isArray(value) ? value : [value];
		this.#setValues(values.map(String), options.dispatchChange ?? false, false, options.allowUnknownValue);
	}

	/** @returns A string or null in single mode and a readonly string array in multiple mode. */
	public getValue(): string | readonly string[] | null {
		this.#assertActive();
		return this.#multiple ? [...this.#values] : (this.#values[0] ?? null);
	}

	/** @returns All selected canonical string values in selection order. */
	public getValues(): readonly string[] {
		this.#assertActive();
		return [...this.#values];
	}

	/** @returns The current value serialized for an input source. */
	public getValueString(): string {
		this.#assertActive();
		return this.#serializeValues(this.#values);
	}

	/** @returns Selected known options with their typed metadata. */
	public getSelectedOptions(): readonly CustomizableSelectOption<TData>[] {
		this.#assertActive();
		return this.#values.flatMap((value) => {
			const option = this.#options.find((candidate) => candidate.key === value);
			if (option === undefined) {
				return [];
			}
			return [toPublicOption(option)];
		});
	}

	/**
	 * Merges options into the local set and selects them.
	 * @param options Options to merge and select.
	 * @param setValueOptions Per-update event and unknown-value behavior.
	 */
	public setSelectedOptions(options: readonly CustomizableSelectOption<TData>[], setValueOptions: CustomizableSelectSetValueOptions = {}): void {
		this.#assertActive();
		const merged = new Map(this.#options.map((option) => [option.key, option]));
		for (const option of normalizeOptions(options)) {
			merged.set(option.key, option);
		}
		this.setOptions([...merged.values()]);
		this.setValue(
			options.map((option) => option.id),
			setValueOptions,
		);
	}

	/**
	 * Changes selection cardinality and synchronizes a select source's multiple state.
	 * @param multiple Whether multiple values are allowed.
	 */
	public setMultiple(multiple: boolean): void {
		this.#assertActive();
		if (this.#multiple === multiple) {
			return;
		}
		if (!multiple && this.#options.filter((option) => option.locked).length > 1) {
			throw new Error('Single-select CustomizableSelect cannot contain multiple locked options');
		}
		this.#multiple = multiple;
		if (this.source instanceof HTMLSelectElement) {
			this.source.multiple = multiple;
		}
		this.#results.toggleAttribute('aria-multiselectable', multiple);
		this.#setValues(this.#values, false, false);
	}

	/**
	 * Changes disabled state on both the component and native source.
	 * @param disabled Whether all interaction and form submission are disabled.
	 */
	public setDisabled(disabled: boolean): void {
		this.#assertActive();
		this.#disabled = disabled;
		this.source.disabled = disabled;
		if (disabled) {
			this.close();
		}
		this.#renderDisabledState();
	}

	/**
	 * Changes readonly state while retaining keyboard focusability.
	 * @param readOnly Whether user value changes are prevented.
	 */
	public setReadOnly(readOnly: boolean): void {
		this.#assertActive();
		this.#readOnly = readOnly;
		if (this.source instanceof HTMLInputElement) {
			this.source.readOnly = readOnly;
		}
		if (readOnly) {
			this.close();
		}
		this.#renderDisabledState();
	}

	/**
	 * Updates the component color scheme.
	 * @param theme Light, dark, or system (follows OS preference).
	 */
	public setTheme(theme: ThemeMode): void {
		this.#assertActive();
		this.element.dataset['theme'] = theme;
	}

	/** Removes generated UI and listeners and restores the source presentation. */
	public destroy(): void {
		if (this.#destroyed) {
			return;
		}
		this.#eventController.abort();
		this.#observer.disconnect();
		this.element.remove();
		this.#restoreSnapshot();
		if (instances.get(this.source) === this) {
			instances.delete(this.source);
		}
		this.#destroyed = true;
	}

	#bindEvents(): void {
		const {signal} = this.#eventController;
		this.#selection.addEventListener(
			'click',
			(event) => {
				this.#handleSelectionClick(event);
			},
			{signal},
		);
		this.#selection.addEventListener(
			'keydown',
			(event) => {
				this.#handleControlKeydown(event);
			},
			{signal},
		);
		this.#searchInput.addEventListener(
			'input',
			() => {
				this.#query = this.#searchInput.value;
				this.#activeKey = this.#firstEnabledKey();
				this.#renderResults();
			},
			{signal},
		);
		this.#searchInput.addEventListener(
			'keydown',
			(event) => {
				this.#handleControlKeydown(event);
			},
			{signal},
		);
		this.source.addEventListener(
			'change',
			() => {
				if (!this.#syncingSource) {
					this.#readSourceValue();
					this.#render();
				}
			},
			{signal},
		);
		this.source.form?.addEventListener(
			'reset',
			() => {
				queueMicrotask(() => {
					if (!this.#destroyed) {
						this.#readSourceValue();
					}
				});
			},
			{signal},
		);
		document.addEventListener(
			'pointerdown',
			(event) => {
				if (this.#open && !this.element.contains(event.target as Node)) {
					this.close();
				}
			},
			{signal},
		);
	}

	#handleSelectionClick(event: MouseEvent): void {
		const target = event.target instanceof Element ? event.target : null;
		const removeButton = target?.closest<HTMLButtonElement>('[data-remove-value]') ?? null;
		if (removeButton !== null) {
			event.stopPropagation();
			this.#toggleValue(removeButton.dataset['removeValue'] ?? '', true);
			return;
		}
		const clearButton = target?.closest<HTMLButtonElement>('[data-clear]') ?? null;
		if (clearButton !== null) {
			event.stopPropagation();
			this.#clear(true);
			return;
		}
		if (this.#open) {
			this.close();
		} else {
			this.open();
		}
	}

	#handleControlKeydown(event: KeyboardEvent): void {
		if (event.target instanceof HTMLButtonElement) {
			return;
		}
		if (event.key === 'Escape' && this.#open) {
			event.preventDefault();
			this.close();
			this.#selection.focus();
			return;
		}
		if (event.key === 'Tab') {
			this.close();
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			if (!this.#open) {
				this.open();
			}
			this.#moveActive(event.key);
			return;
		}
		if (event.key === 'Enter' || (event.key === ' ' && event.currentTarget === this.#selection)) {
			event.preventDefault();
			if (!this.#open) {
				this.open();
				return;
			}
			if (this.#activeKey !== null) {
				this.#toggleValue(this.#activeKey, true);
			}
		}
	}

	#moveActive(key: string): void {
		const enabled = this.#filteredOptions().filter((option) => !option.disabled);
		if (enabled.length === 0) {
			this.#activeKey = null;
			this.#renderResults();
			return;
		}
		const currentIndex = enabled.findIndex((option) => option.key === this.#activeKey);
		let index: number;
		if (key === 'Home') {
			index = 0;
		} else if (key === 'End') {
			index = enabled.length - 1;
		} else if (key === 'ArrowUp') {
			index = currentIndex <= 0 ? enabled.length - 1 : currentIndex - 1;
		} else {
			index = currentIndex === -1 || currentIndex === enabled.length - 1 ? 0 : currentIndex + 1;
		}
		this.#activeKey = enabled[index]?.key ?? null;
		this.#renderResults();
		this.#results.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({block: 'nearest'});
	}

	#toggleValue(key: string, userInitiated: boolean): void {
		const option = this.#options.find((candidate) => candidate.key === key);
		if (option === undefined) {
			return;
		}
		if (option.disabled || option.locked || this.#disabled || this.#readOnly) {
			return;
		}
		const selected = this.#values.includes(key);
		const nextValues = this.#multiple ? (selected ? this.#values.filter((value) => value !== key) : [...this.#values, key]) : selected ? [] : [key];
		this.#setValues(nextValues, true, userInitiated);
		this.#dispatch(selected ? 'customizable-select:unselect' : 'customizable-select:select', toPublicOption(option));
		if (this.#optionsConfig.closeOnSelect ?? !this.#multiple) {
			this.close();
		}
	}

	#clear(userInitiated: boolean): void {
		const lockedValues = this.#options.filter((option) => option.locked).map((option) => option.key);
		if (this.#values.every((value) => lockedValues.includes(value))) {
			return;
		}
		this.#setValues(lockedValues, true, userInitiated);
		this.#dispatch('customizable-select:clear', this.#changeDetail(userInitiated));
	}

	#setValues(values: readonly string[], dispatchChange: boolean, userInitiated: boolean, allowUnknownOverride?: boolean): void {
		const validKeys = new Set(this.#options.map((option) => option.key));
		const allowUnknown = allowUnknownOverride ?? this.#optionsConfig.allowUnknownValue ?? false;
		const uniqueValues = [...new Set(values)].filter((value) => allowUnknown || validKeys.has(value));
		const lockedValues = this.#options.filter((option) => option.locked).map((option) => option.key);
		const normalized = [...lockedValues, ...uniqueValues.filter((value) => !lockedValues.includes(value))];
		this.#values = this.#multiple ? normalized : normalized.slice(0, 1);
		this.#writeSourceValue();
		this.#render();
		if (dispatchChange) {
			this.#syncingSource = true;
			this.source.dispatchEvent(new Event('change', {bubbles: true}));
			this.#syncingSource = false;
			this.#dispatch('customizable-select:change', this.#changeDetail(userInitiated));
		}
	}

	#readSourceValue(): void {
		const values =
			this.source instanceof HTMLSelectElement
				? [...this.source.selectedOptions].map((option) => option.value)
				: (this.#optionsConfig.parseInputValue ?? defaultParseInputValue)(this.source.value, this.#multiple).map(String);
		this.#setValues(values, false, false);
	}

	#writeSourceValue(): void {
		if (this.source instanceof HTMLSelectElement) {
			for (const option of this.source.querySelectorAll('option[data-customizable-select-unknown]')) {
				option.remove();
			}
			const sourceValues = new Set([...this.source.options].map((option) => option.value));
			for (const value of this.#values) {
				if (!sourceValues.has(value)) {
					const option = document.createElement('option');
					option.value = value;
					option.hidden = true;
					option.dataset['customizableSelectUnknown'] = 'true';
					this.source.append(option);
				}
			}
			for (const option of this.source.options) {
				option.selected = this.#values.includes(option.value);
			}
			return;
		}
		this.source.value = this.#serializeValues(this.#values);
	}

	#writeSelectOptions(selectedValues: readonly string[] = this.#values, resetValues: readonly string[] = selectedValues): void {
		if (!(this.source instanceof HTMLSelectElement)) {
			return;
		}
		const selected = new Set(selectedValues);
		const reset = new Set(resetValues);
		const fragment = document.createDocumentFragment();
		for (const option of this.#options) {
			const element = document.createElement('option');
			element.value = option.key;
			element.text = option.text;
			element.disabled = option.disabled ?? false;
			element.selected = selected.has(option.key);
			element.defaultSelected = reset.has(option.key);
			if (option.locked) {
				element.dataset['locked'] = 'true';
			}
			fragment.append(element);
		}
		this.source.replaceChildren(fragment);
	}

	#serializeValues(values: readonly string[]): string {
		return (this.#optionsConfig.serializeInputValue ?? defaultSerializeInputValue)(values, this.#multiple);
	}

	#applyTheme(): void {
		this.element.dataset['theme'] = this.#optionsConfig.theme ?? 'system';
	}

	#render(): void {
		this.#renderSelection();
		this.#renderResults();
		this.#renderDisabledState();
		this.#renderOpenState();
	}

	#renderSelection(): void {
		this.#selection.replaceChildren();
		const selectedOptions = this.#values.flatMap((value) => {
			const option = this.#options.find((candidate) => candidate.key === value);
			return option === undefined ? [] : [option];
		});
		if (selectedOptions.length === 0) {
			const placeholder = document.createElement('span');
			placeholder.className = 'customizable-select__placeholder';
			placeholder.textContent = this.#optionsConfig.placeholder ?? this.source.getAttribute('placeholder') ?? '';
			this.#selection.append(placeholder);
		} else if (this.#multiple) {
			const values = document.createElement('span');
			values.className = 'customizable-select__values';
			for (const option of selectedOptions) {
				const tag = document.createElement('span');
				tag.className = 'customizable-select__tag';
				this.#renderSelectionContent(tag, option);
				if (!option.locked && (this.#optionsConfig.allowClear ?? true)) {
					const remove = document.createElement('button');
					remove.className = 'customizable-select__remove';
					remove.type = 'button';
					remove.dataset['removeValue'] = option.key;
					remove.setAttribute('aria-label', this.#messages.remove(option.text));
					remove.textContent = '×';
					tag.append(remove);
				}
				values.append(tag);
			}
			this.#selection.append(values);
		} else {
			const value = document.createElement('span');
			value.className = 'customizable-select__value';
			const [selectedOption] = selectedOptions;
			if (selectedOption !== undefined) {
				this.#renderSelectionContent(value, selectedOption);
			}
			this.#selection.append(value);
		}

		if ((this.#optionsConfig.allowClear ?? true) && selectedOptions.some((option) => !option.locked)) {
			const clear = document.createElement('button');
			clear.className = 'customizable-select__clear';
			clear.type = 'button';
			clear.dataset['clear'] = 'true';
			clear.setAttribute('aria-label', this.#messages.clear);
			clear.textContent = '×';
			this.#selection.append(clear);
		}
		const arrow = document.createElement('span');
		arrow.className = 'customizable-select__arrow';
		arrow.setAttribute('aria-hidden', 'true');
		this.#selection.append(arrow);
	}

	#renderSelectionContent(element: HTMLElement, option: NormalizedOption<TData>): void {
		const renderer = this.#optionsConfig.renderSelection;
		appendRenderedContent(element, renderer === undefined ? option.text : renderer({multiple: this.#multiple, option: toPublicOption(option)}));
	}

	#renderResults(): void {
		this.#results.replaceChildren();
		const filtered = this.#filteredOptions();
		if (filtered.length === 0) {
			const empty = document.createElement('li');
			empty.className = 'customizable-select__no-results';
			empty.textContent = this.#messages.noResults;
			this.#results.append(empty);
			this.#setActiveDescendant(null);
			return;
		}
		for (const [index, option] of filtered.entries()) {
			const selected = this.#values.includes(option.key);
			const active = option.key === this.#activeKey;
			const element = document.createElement('li');
			element.id = `${this.#results.id}-option-${String(index)}`;
			element.className = 'customizable-select__option';
			element.role = 'option';
			element.dataset['optionId'] = option.key;
			element.dataset['active'] = String(active);
			element.setAttribute('aria-selected', String(selected));
			if (option.disabled) {
				element.setAttribute('aria-disabled', 'true');
			}
			const renderer = this.#optionsConfig.renderOption;
			appendRenderedContent(element, renderer === undefined ? option.text : renderer({active, option: toPublicOption(option), query: this.#query, selected}));
			element.addEventListener('pointermove', () => {
				if (!option.disabled && this.#activeKey !== option.key) {
					this.#activeKey = option.key;
					this.#renderResults();
				}
			});
			element.addEventListener('click', () => {
				this.#toggleValue(option.key, true);
			});
			this.#results.append(element);
		}
		const activeElement = this.#results.querySelector<HTMLElement>('[data-active="true"]');
		this.#setActiveDescendant(activeElement?.id ?? null);
	}

	#renderDisabledState(): void {
		const unavailable = this.#disabled || this.#readOnly;
		this.element.classList.toggle('customizable-select--disabled', this.#disabled);
		this.element.classList.toggle('customizable-select--readonly', this.#readOnly);
		this.#selection.setAttribute('aria-disabled', String(unavailable));
		this.#selection.tabIndex = this.#disabled ? -1 : 0;
		for (const button of this.#selection.querySelectorAll<HTMLButtonElement>('button')) {
			button.disabled = unavailable;
		}
	}

	#renderOpenState(): void {
		this.#dropdown.hidden = !this.#open;
		this.element.classList.toggle('customizable-select--open', this.#open);
		const searchActive = this.#open && (this.#optionsConfig.searchable ?? true);
		if (searchActive) {
			this.#selection.removeAttribute('role');
			this.#searchInput.setAttribute('role', 'combobox');
		} else {
			this.#selection.setAttribute('role', 'combobox');
			this.#searchInput.setAttribute('role', 'searchbox');
		}
		this.#selection.setAttribute('aria-expanded', String(this.#open));
		this.#searchInput.setAttribute('aria-expanded', String(this.#open));
		this.#selection.setAttribute('aria-required', String(this.source.required));
		this.#searchInput.hidden = !(this.#optionsConfig.searchable ?? true);
	}

	#filteredOptions(): readonly NormalizedOption<TData>[] {
		const filter = this.#optionsConfig.filterOption ?? defaultFilter;
		return this.#options.filter((option) => filter(toPublicOption(option), this.#query));
	}

	#firstEnabledKey(): string | null {
		return this.#filteredOptions().find((option) => !option.disabled)?.key ?? null;
	}

	#setActiveDescendant(id: string | null): void {
		for (const element of [this.#selection, this.#searchInput]) {
			if (id === null) {
				element.removeAttribute('aria-activedescendant');
			} else {
				element.setAttribute('aria-activedescendant', id);
			}
		}
	}

	#syncSourceState(): void {
		if (this.#destroyed) {
			return;
		}
		this.#disabled = this.source.disabled;
		this.#readOnly = this.source instanceof HTMLInputElement && this.source.readOnly;
		if (this.source instanceof HTMLSelectElement && this.source.multiple !== this.#multiple) {
			this.#multiple = this.source.multiple;
			this.#results.toggleAttribute('aria-multiselectable', this.#multiple);
			this.#readSourceValue();
		}
		if (this.#disabled || this.#readOnly) {
			this.close();
		}
		this.#render();
	}

	#createSnapshot(): SourceSnapshot {
		return {
			ariaHidden: this.source.getAttribute('aria-hidden'),
			className: this.source.className,
			disabled: this.source.disabled,
			inputReadOnly: this.source instanceof HTMLInputElement ? this.source.readOnly : null,
			multiple: this.source instanceof HTMLSelectElement ? this.source.multiple : null,
			selectContents: this.source instanceof HTMLSelectElement ? [...this.source.childNodes].map((node) => node.cloneNode(true)) : null,
			tabIndex: this.source.getAttribute('tabindex'),
		};
	}

	#restoreSnapshot(): void {
		const currentValue = this.source.value;
		const currentValues = this.source instanceof HTMLSelectElement ? [...this.source.selectedOptions].map((option) => option.value) : [];
		this.source.className = this.#snapshot.className;
		this.source.disabled = this.#snapshot.disabled;
		if (this.#snapshot.ariaHidden === null) {
			this.source.removeAttribute('aria-hidden');
		} else {
			this.source.setAttribute('aria-hidden', this.#snapshot.ariaHidden);
		}
		if (this.#snapshot.tabIndex === null) {
			this.source.removeAttribute('tabindex');
		} else {
			this.source.setAttribute('tabindex', this.#snapshot.tabIndex);
		}
		if (this.source instanceof HTMLInputElement && this.#snapshot.inputReadOnly !== null) {
			this.source.readOnly = this.#snapshot.inputReadOnly;
			this.source.value = currentValue;
		}
		if (this.source instanceof HTMLSelectElement && this.#snapshot.multiple !== null && this.#snapshot.selectContents !== null) {
			this.source.multiple = this.#snapshot.multiple;
			this.source.replaceChildren(...this.#snapshot.selectContents.map((node) => node.cloneNode(true)));
			for (const option of this.source.options) {
				option.selected = currentValues.includes(option.value);
			}
		}
	}

	#changeDetail(userInitiated: boolean): CustomizableSelectChangeDetail<TData> {
		return {
			value: this.#multiple ? [...this.#values] : (this.#values[0] ?? null),
			values: [...this.#values],
			selectedOptions: this.getSelectedOptions(),
			userInitiated,
		};
	}

	#dispatch<K extends keyof CustomizableSelectEventMap<TData>>(
		type: K,
		detail?: CustomizableSelectEventMap<TData>[K] extends CustomEvent<infer TDetail> ? TDetail : never,
	): void {
		this.element.dispatchEvent(new CustomEvent(type, {bubbles: true, detail}));
	}

	#assertActive(): void {
		if (this.#destroyed) {
			throw new Error('CustomizableSelect instance has been destroyed');
		}
	}
}

/**
 * Creates and registers a component, replacing any instance already attached to the source.
 * @param target Source element or selector resolving to one.
 * @param options Component configuration.
 * @returns The registered component instance.
 */
export function createCustomizableSelect<TData = unknown>(
	target: string | HTMLInputElement | HTMLSelectElement,
	options: CustomizableSelectOptions<TData> = {},
): CustomizableSelect<TData> {
	const source = resolveTarget(target);
	instances.get(source)?.destroy();
	const instance = new CustomizableSelect(source, options);
	instances.set(source, instance as CustomizableSelect);
	return instance;
}

/**
 * Returns the factory-created component attached to a source, if present.
 * @param target Source element or selector resolving to one.
 * @returns The registered instance, if one exists.
 */
export function getCustomizableSelect<TData = unknown>(target: string | HTMLInputElement | HTMLSelectElement): CustomizableSelect<TData> | undefined {
	return instances.get(resolveTarget(target)) as CustomizableSelect<TData> | undefined;
}

/**
 * Destroys the factory-created component attached to a source.
 * @param target Source element or selector resolving to one.
 */
export function destroyCustomizableSelect(target: string | HTMLInputElement | HTMLSelectElement): void {
	getCustomizableSelect(target)?.destroy();
}
