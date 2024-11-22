import type { Meta } from "@storybook/react";
import React from "react";

import {
  Button,
  FolderIcon,
  Icon,
  Label,
  LockIcon,
  RadioGroup,
  RadioGroupChoice,
  RadioGroupItem,
} from "@sparkle/index_with_tw_base";

const meta = {
  title: "Primitives/RadioGroup",
} satisfies Meta;

export default meta;
export const RadioGroupExample = () => {
  return (
    <div className="s-flex s-flex-col s-gap-10">
      <RadioGroup defaultValue="option-one">
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-one"
            id="option-one"
            label={<Label htmlFor="option-one">Option One</Label>}
          />
        </div>
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-two"
            id="option-two"
            label={<Label htmlFor="option-two">Option Two</Label>}
          />
        </div>
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-three"
            id="option-three"
            label={<Label htmlFor="option-two">Option Three</Label>}
          />
        </div>
      </RadioGroup>
      <RadioGroup defaultValue="option-one">
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-one"
            id="option-four"
            size="sm"
            tooltipMessage="This is a nice tooltip message"
            label={<Label htmlFor="option-one">Option One</Label>}
          />
        </div>
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-two"
            id="option-five"
            size="sm"
            disabled
            label={<Label htmlFor="option-two">Option Two</Label>}
          />
        </div>
        <div className="s-flex s-items-center s-space-x-2">
          <RadioGroupItem
            value="option-six"
            id="option-three"
            size="sm"
            label={<Label htmlFor="option-three">Option Three</Label>}
          />
        </div>
      </RadioGroup>
    </div>
  );
};

export const RadioGroupWithChildrenExample = () => {
  const [selectedChoice, setSelectedChoice] =
    React.useState<string>("option-one");

  const choices = [
    { id: "option-one", label: "Option One" },
    { id: "option-two", label: "Option Two" },
    { id: "option-three", label: "Option Three" },
  ];
  return (
    <div className="s-flex s-flex-col s-gap-10">
      <RadioGroup
        defaultValue="option-one"
        onValueChange={(value) => setSelectedChoice(value)}
      >
        {choices.map((choice) => (
          <RadioGroupChoice
            value={choice.id}
            iconPosition="start"
            label={
              <div className="s-flex s-items-center s-gap-2">
                <Icon visual={LockIcon} />
                <Label>{choice.label}</Label>
              </div>
            }
          >
            <div className="s-flex s-items-center s-gap-2 s-border s-border-red-500 s-p-2">
              <Icon visual={FolderIcon} />
              <Label>{choice.label}</Label>
              <Button label="Click me" />
            </div>
            {choice.id === selectedChoice && (
              <span>{choice.label} is selected</span>
            )}
          </RadioGroupChoice>
        ))}
      </RadioGroup>
    </div>
  );
};
