import React, { useState } from 'react';
import { Card, Input, Button } from '../../ui';
import { AVATAR_OPTIONS, AvatarOption, UserCreationForm, User } from '../../../types';

interface UserCreationStepProps {
  onComplete: (userData: UserCreationForm) => void;
  onUserCreated?: (user: Omit<User, 'id'>) => void;
  existingUsers?: User[];
  showAddAnother?: boolean;
  onAddAnother?: () => void;
}

export const UserCreationStep: React.FC<UserCreationStepProps> = ({ 
  onComplete, 
  onUserCreated,
  existingUsers = [],
  showAddAnother = false,
  onAddAnother 
}) => {
  const [formData, setFormData] = useState<UserCreationForm>({
    name: '',
    email: '',
    avatar: AVATAR_OPTIONS[0].emoji
  });
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption>(AVATAR_OPTIONS[0]);

  const handleSubmit = () => {
    if (formData.name.trim()) {
      // Erstelle User-Objekt
      const userData: Omit<User, 'id'> = {
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar,
        joinedAt: new Date(),
        isActive: true,
        currentMonthPoints: 0,
        targetMonthlyPoints: 100,
        totalCompletedTasks: 0
      };
      
      if (onUserCreated) {
        onUserCreated(userData);
      }
      onComplete(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🏠 Neuer Putzplan
          </h1>
          <p className="text-gray-600">
            Zuerst erstellen wir dein Profil
          </p>
        </div>

        {/* Avatar Auswahl */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Wähle dein Profilbild
          </label>
          
          <div className="text-center mb-4">
            <div className="inline-block w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-2">
              {selectedAvatar.emoji}
            </div>
            <p className="text-sm text-gray-600">{selectedAvatar.name}</p>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {AVATAR_OPTIONS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => {
                  setSelectedAvatar(avatar);
                  setFormData(prev => ({ ...prev, avatar: avatar.emoji }));
                }}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors
                  ${selectedAvatar.id === avatar.id 
                    ? 'bg-blue-100 border-2 border-blue-500' 
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                {avatar.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Formular */}
        <div className="space-y-4">
          <Input
            label="Dein Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="z.B. Max Mustermann"
            required
          />
          
          <Input
            label="E-Mail (optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="max@beispiel.de"
            helpText="Für Erinnerungen und Einladungen"
          />
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!formData.name.trim()}
          >
            Weiter zum Putzplan
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            📸 Später kannst du auch ein eigenes Foto hochladen
          </p>
        </div>
      </Card>
    </div>
  );
};