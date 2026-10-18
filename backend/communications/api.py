from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsActiveRepresentative
from .models import Delivery


class NotificationSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='announcement.title', read_only=True)
    body = serializers.CharField(source='announcement.body', read_only=True)

    class Meta:
        model = Delivery
        fields = ('id', 'title', 'body', 'read_at', 'created_at')


class PortalNotificationListView(ListAPIView):
    permission_classes = [IsActiveRepresentative]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Delivery.objects.filter(representative=self.request.user.representative, channel='in_app').select_related('announcement')


class PortalNotificationReadView(APIView):
    permission_classes = [IsActiveRepresentative]

    def post(self, request, pk):
        item = get_object_or_404(Delivery, pk=pk, representative=request.user.representative, channel='in_app')
        if not item.read_at:
            item.read_at = timezone.now()
            item.save(update_fields=['read_at', 'updated_at'])
        return Response({'id': item.pk, 'read_at': item.read_at})
