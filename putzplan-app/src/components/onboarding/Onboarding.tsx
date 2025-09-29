import React, { useState } from 'react';
import { Card, Input, Button, Select } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    targetPoints: 100,
    wgName: '',
    wgDescription: '',
    inviteCode: ''
  });
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { createUser, createWG, joinWG } = usePutzplanStore();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async () => {
    setIsLoading(true);
    try {
      await createUser({
        name: formData.name,
        email: formData.email || undefined,
        targetMonthlyPoints: formData.targetPoints
      });
      setStep(2);
    } catch (error) {
      console.error('Error creating user:', error);
    }
    setIsLoading(false);
  };

  const handleCreateWG = async () => {
    setIsLoading(true);
    try {
      const wg = await createWG({
        name: formData.wgName,
        description: formData.wgDescription || undefined,
        monthlyPointsTarget: formData.targetPoints
      });
      console.log('WG created:', wg);
      onComplete();
    } catch (error) {
      console.error('Error creating WG:', error);
    }
    setIsLoading(false);
  };

  const handleJoinWG = async () => {
    setIsLoading(true);
    try {
      const wg = await joinWG(formData.inviteCode);
      console.log('Joined WG:', wg);
      onComplete();
    } catch (error) {
      console.error('Error joining WG:', error);
    }
    setIsLoading(false);
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🧹 Willkommen bei Putzplan!
            </h1>
            <p className="text-gray-600">
              Erstelle dein Profil und starte mit deiner WG
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Dein Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="z.B. Max Mustermann"
              required
            />
            
            <Input
              label="E-Mail (optional)"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="max@beispiel.de"
            />
            
            <Select
              label="Monatliches Punkteziel"
              value={formData.targetPoints.toString()}
              onChange={(e) => handleInputChange('targetPoints', parseInt(e.target.value))}
              options={[
                { value: '50', label: '50 Punkte (entspannt)' },
                { value: '100', label: '100 Punkte (normal)' },
                { value: '150', label: '150 Punkte (fleißig)' },
                { value: '200', label: '200 Punkte (sehr aktiv)' }
              ]}
              helpText="Du kannst das später ändern"
            />
          </div>

          <div className="mt-6">
            <Button
              onClick={handleCreateUser}
              className="w-full"
              disabled={!formData.name.trim()}
              isLoading={isLoading}
            >
              Weiter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Hi {formData.name}! 👋
            </h2>
            <p className="text-gray-600">
              Möchtest du eine neue WG erstellen oder einer bestehenden beitreten?
            </p>
          </div>

          {!mode ? (
            <div className="space-y-3">
              <Button
                onClick={() => setMode('create')}
                className="w-full"
                size="lg"
              >
                🏠 Neue WG erstellen
              </Button>
              
              <Button
                onClick={() => setMode('join')}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                🔗 Bestehender WG beitreten
              </Button>
            </div>
          ) : mode === 'create' ? (
            <div className="space-y-4">
              <Input
                label="WG Name"
                value={formData.wgName}
                onChange={(e) => handleInputChange('wgName', e.target.value)}
                placeholder="z.B. Villa Kunterbunt"
                required
              />
              
              <Input
                label="Beschreibung (optional)"
                value={formData.wgDescription}
                onChange={(e) => handleInputChange('wgDescription', e.target.value)}
                placeholder="z.B. 4er-WG in der Innenstadt"
              />
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setMode(null)}
                  variant="ghost"
                  className="flex-1"
                >
                  Zurück
                </Button>
                <Button
                  onClick={handleCreateWG}
                  className="flex-1"
                  disabled={!formData.wgName.trim()}
                  isLoading={isLoading}
                >
                  WG erstellen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Einladungscode"
                value={formData.inviteCode}
                onChange={(e) => handleInputChange('inviteCode', e.target.value.toUpperCase())}
                placeholder="z.B. ABC123XY"
                required
              />
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setMode(null)}
                  variant="ghost"
                  className="flex-1"
                >
                  Zurück
                </Button>
                <Button
                  onClick={handleJoinWG}
                  className="flex-1"
                  disabled={!formData.inviteCode.trim()}
                  isLoading={isLoading}
                >
                  WG beitreten
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return null;
};