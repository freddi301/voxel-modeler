import React from "react";
import { css } from "styled-components/macro";

export function useObjectEditor<T>(schema: Schema<T>) {
  const [value, setValue] = React.useState(schema.initial);
  const render = <schema.View label={""} value={value} onChange={setValue} />;
  const onChange = setValue;
  return { value, onChange, render };
}

type Schema<Value> = {
  initial: Value;
  View: React.FunctionComponent<{
    label: string;
    value: Value;
    onChange(value: Value): void;
  }>;
};

export type ValueOfSchema<S> = S extends Schema<infer Value> ? Value : never;

export function object<Fields extends Record<string, Schema<any>>>(
  fields: Fields
): Schema<{ [K in keyof Fields]: ValueOfSchema<Fields[K]> }> {
  return {
    initial: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v.initial])
    ) as any,
    View({ label, value, onChange }) {
      const [isOpen, setIsOpen] = React.useState(true);
      return (
        <div>
          <div
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            {!isOpen ? ">" : "v"} <strong>{label}: </strong>
          </div>
          {isOpen &&
            Object.entries(fields).map(([k, v]) => {
              return (
                <div
                  key={k}
                  css={css`
                    margin-left: 8px;
                  `}
                >
                  {isOpen && (
                    <v.View
                      label={k}
                      value={value[k]}
                      onChange={(v) => onChange({ ...value, [k]: v })}
                    />
                  )}
                </div>
              );
            })}
        </div>
      );
    },
  };
}

export function number(initial = 0): Schema<number> {
  return {
    initial,
    View({ label, value, onChange }) {
      const [v, setV] = React.useState(String(value));
      React.useEffect(() => {
        setV(String(value));
      }, [value]);
      const [step, setStep] = React.useState("0.1");
      return (
        <div>
          <strong>{label}: </strong>{" "}
          <input
            type="number"
            step={Number(step)}
            value={v}
            onChange={(event) => {
              const v = event.currentTarget.value;
              setV(v);
              if (!isNaN(Number(v))) {
                onChange(Number(v));
              }
            }}
          />{" "}
          step{" "}
          <input
            type="number"
            value={step}
            onChange={(event) => setStep(event.currentTarget.value)}
            css={css`
              width: 50px;
            `}
          />
        </div>
      );
    },
  };
}

export function boolean(initial = false): Schema<boolean> {
  return {
    initial,
    View({ label, value, onChange }) {
      return (
        <div>
          <strong>{label}: </strong>{" "}
          <input
            type="checkbox"
            checked={value}
            onChange={(event) => {
              onChange(event.currentTarget.checked);
            }}
          />
        </div>
      );
    },
  };
}

export function string(initial = ""): Schema<string> {
  return {
    initial,
    View({ label, value, onChange }) {
      const [v, setV] = React.useState(String(value));
      React.useEffect(() => {
        setV(String(value));
      }, [value]);
      return (
        <div>
          <strong>{label}: </strong>{" "}
          <input
            type="text"
            value={v}
            onChange={(event) => {
              const v = event.currentTarget.value;
              setV(v);
              onChange(v);
            }}
          />
        </div>
      );
    },
  };
}
