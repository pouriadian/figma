from rest_framework.permissions import BasePermission
from .models import Representative, User


class IsActiveRepresentative(BasePermission):
    message = 'دسترسی فقط برای نمایندگان فعال مجاز است.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user.is_authenticated and user.is_active
            and user.role == User.Role.REPRESENTATIVE
            and Representative.objects.filter(user=user, status=Representative.Status.ACTIVE).exists()
        )
