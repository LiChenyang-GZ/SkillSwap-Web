import { Edit, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import type { User } from "../../../types/user";
import { getUniversityDisplayName } from "../../onboarding/utils/universityMapper";

interface DashboardProfileCardProps {
  user: User;
  onEditProfile: () => void;
}

export function DashboardProfileCard({ user, onEditProfile }: DashboardProfileCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4">
            <AvatarImage key={user.avatarUrl || "empty-avatar"} src={user.avatarUrl} alt={user.username} />
            <AvatarFallback className="text-lg">
              {user.username
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold mb-4 break-words">{user.username}</h2>
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{getUniversityDisplayName(user.university)}</span>
          </div>

          <Button variant="outline" size="sm" className="w-full mb-4" onClick={onEditProfile}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>

          {user.bio && <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
