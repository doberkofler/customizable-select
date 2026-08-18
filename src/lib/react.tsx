import {forwardRef, useEffect, useRef, type ForwardedRef, type ReactElement} from 'react';

import {
	CustomizableSelect as NativeCustomizableSelect,
	type CustomizableSelectChangeDetail,
	type CustomizableSelectOption,
	type CustomizableSelectOptions,
	type CustomizableSelectValue,
} from './widget.ts';

export type CustomizableSelectReactProps<TData = unknown> = CustomizableSelectOptions<TData> & {
	readonly options: readonly CustomizableSelectOption<TData>[];
	/** Controlled value. User changes are reported through onValueChange. */
	readonly value?: CustomizableSelectValue | readonly CustomizableSelectValue[] | null;
	/** Initial value used when value is uncontrolled. */
	readonly defaultValue?: CustomizableSelectValue | readonly CustomizableSelectValue[] | null;
	/** Receives typed details after user-originated changes. */
	readonly onValueChange?: (detail: CustomizableSelectChangeDetail<TData>) => void;
	/** Native form field name. */
	readonly name?: string;
	/** Native required state. */
	readonly required?: boolean;
	/** Native source created by the adapter. Defaults to select. */
	readonly sourceElement?: 'input' | 'select';
	/** Class added to the adapter's native source element. */
	readonly sourceClassName?: string;
};

function setForwardedRef<TData>(ref: ForwardedRef<NativeCustomizableSelect<TData>>, value: NativeCustomizableSelect<TData> | null): void {
	if (typeof ref === 'function') {
		ref(value);
		return;
	}
	if (ref !== null) {
		ref.current = value;
	}
}

function CustomizableSelectComponent<TData>(props: CustomizableSelectReactProps<TData>, ref: ForwardedRef<NativeCustomizableSelect<TData>>): ReactElement {
	const {value, defaultValue, onValueChange, name, required, sourceElement = 'select', sourceClassName, options, ...configuration} = props;
	const inputRef = useRef<HTMLInputElement | null>(null);
	const selectRef = useRef<HTMLSelectElement | null>(null);
	const instanceRef = useRef<NativeCustomizableSelect<TData> | null>(null);
	const onValueChangeRef = useRef(onValueChange);
	const valueRef = useRef(value);
	const initializationRef = useRef({configuration, defaultValue, options, value});

	useEffect(() => {
		onValueChangeRef.current = onValueChange;
		valueRef.current = value;
		initializationRef.current = {configuration, defaultValue, options, value};
	});

	useEffect(() => {
		const source = inputRef.current ?? selectRef.current;
		if (source === null) {
			return;
		}
		const initialization = initializationRef.current;
		const instance = new NativeCustomizableSelect<TData>(source, {...initialization.configuration, options: initialization.options});
		const initialValue = initialization.value === undefined ? initialization.defaultValue : initialization.value;
		if (initialValue !== undefined) {
			instance.setValue(initialValue);
			if (source instanceof HTMLSelectElement) {
				for (const option of source.options) {
					option.defaultSelected = option.selected;
				}
			} else {
				source.defaultValue = source.value;
			}
		}
		const handleChange = (event: CustomEvent<CustomizableSelectChangeDetail<TData>>): void => {
			onValueChangeRef.current?.(event.detail);
			if (valueRef.current !== undefined) {
				instance.setValue(valueRef.current);
			}
		};
		instance.addEventListener('customizable-select:change', handleChange);
		instanceRef.current = instance;

		return (): void => {
			instance.removeEventListener('customizable-select:change', handleChange);
			instanceRef.current = null;
			instance.destroy();
		};
	}, [sourceElement]);

	useEffect(() => {
		setForwardedRef(ref, instanceRef.current);
		return (): void => {
			setForwardedRef(ref, null);
		};
	}, [ref, sourceElement]);

	useEffect(() => {
		const instance = instanceRef.current;
		instance?.setOptions(options);
		if (instance !== null && valueRef.current !== undefined) {
			instance.setValue(valueRef.current);
		}
	}, [options]);

	useEffect(() => {
		if (value !== undefined) {
			instanceRef.current?.setValue(value);
		}
	}, [value]);

	useEffect(() => {
		if (configuration.multiple !== undefined) {
			instanceRef.current?.setMultiple(configuration.multiple);
		}
	}, [configuration.multiple]);

	useEffect(() => {
		if (configuration.disabled !== undefined) {
			instanceRef.current?.setDisabled(configuration.disabled);
		}
	}, [configuration.disabled]);

	useEffect(() => {
		if (configuration.readOnly !== undefined) {
			instanceRef.current?.setReadOnly(configuration.readOnly);
		}
	}, [configuration.readOnly]);

	return (
		<span className="customizable-select-react">
			{sourceElement === 'input' ? (
				<input ref={inputRef} className={[sourceClassName, 'customizable-select__source'].filter(Boolean).join(' ')} name={name} required={required} />
			) : (
				<select ref={selectRef} className={[sourceClassName, 'customizable-select__source'].filter(Boolean).join(' ')} name={name} required={required} />
			)}
		</span>
	);
}

/** React adapter backed by the native {@link NativeCustomizableSelect} class. */
export const CustomizableSelect = forwardRef(CustomizableSelectComponent) as <TData = unknown>(
	props: CustomizableSelectReactProps<TData> & {readonly ref?: ForwardedRef<NativeCustomizableSelect<TData>>},
) => ReactElement;
