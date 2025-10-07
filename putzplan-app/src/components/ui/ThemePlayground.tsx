import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Input, TextArea, Select } from './Input';
import { Badge } from './Card';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UIStyleSwitcher } from './UIStyleSwitcher';

export const ThemePlayground: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold">Theme Playground</h2>
        <div className="flex gap-4 items-center">
          <ThemeSwitcher />
          <UIStyleSwitcher />
        </div>
      </div>
      <Card>
        <h3 className="text-lg font-medium mb-4">Buttons</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <Button>Primary</Button>
          <Button tone="success">Primary Success</Button>
          <Button tone="warning">Primary Warning</Button>
          <Button tone="danger">Primary Danger</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <h3 className="text-lg font-medium mb-4">Inputs</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Standard" label="Input" />
          <Input placeholder="Mit Fehler" label="Fehler" error="Pflichtfeld" />
          <Select label="Select" options={[{value:'a', label:'Option A'}, {value:'b', label:'Option B'}]} />
          <TextArea label="Textarea" placeholder="Mehrzeilig" />
        </div>
        <h3 className="text-lg font-medium mt-6 mb-4">Badges</h3>
        <div className="flex gap-2 flex-wrap">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </Card>
    </div>
  );
};
